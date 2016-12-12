#!/usr/bin/env ruby
require 'sinatra'
require 'rubygems'
require 'rest_client'
require 'json'
require 'set'
require 'mongo'
require 'uri'
require 'pp'
require 'oauth'
require 'mail'
require 'postmark'
require 'nokogiri'
require 'open-uri'
require 'date'
require 'twitter'

include Mongo

$stdout.sync = true

configure :production do
  require 'newrelic_rpm'
end

$yelpAddressLatLng = {} # latLng of addresses from Yelp

configure do
  
  # DB CONFIG
  conn = Mongo::Client.new(ENV['MONGOHQ_URL'])
  set :mongo_db, conn
  set :STATIONS_COLLECTION, settings.mongo_db['stations']
  set :STATIONS_CONTENT_COLLECTION, settings.mongo_db['station_content']
  set :OUTAGE_TRACKER_COLLECTION, settings.mongo_db['stations_outage_tracker']
  set :OUTAGES_BY_DAY_COLLECTION, settings.mongo_db['stations_outages_by_day']
  puts "dbconnection successful to #{ENV['MONGOHQ_URL']}"
  
  # STATION CONFIG
  station_codes_to_names = Hash.new("")
  station_codes_to_names["BSS"] = "Broad Street Subway Line (SEPTA)"
  station_codes_to_names["MFL"] = "Market Frankford Line (SEPTA)"
  station_codes_to_names["NHSL"] = "Norristown High Speed Line (SEPTA)" 
  station_codes_to_names["PATCO"] = "PATCO High Speed Line"
  station_codes_to_names["RR"] = "Regional Rail (SEPTA)"
  set :STATION_CODES_TO_NAMES, station_codes_to_names
  station_codes_to_search_strings = Hash.new("")
  station_codes_to_search_strings["BSS"] = "Broad"
  station_codes_to_search_strings["MFL"] = "Market"
  station_codes_to_search_strings["NHSL"] = "Norris" 
  station_codes_to_search_strings["PATCO"] = "PATCO"
  station_codes_to_search_strings["RR"] = "Regional"
  set :STATION_CODES_TO_SEARCH_STRINGS, station_codes_to_search_strings
  
  # URLS
  set :app_url, "http://www.unlockphilly.com"
  set :septaElevatorOutagesUrl, 'http://www3.septa.org/hackathon/elevator/'
  
  #TWITTER
  client = Twitter::REST::Client.new do |config|
    config.consumer_key        = ENV['TWITTER_CONSUMER_KEY']
    config.consumer_secret     = ENV['TWITTER_CONSUMER_SECRET']
    config.access_token        = ENV['TWITTER_ACCESS_TOKEN']
    config.access_token_secret = ENV['TWITTER_ACCESS_SECRET']
  end
  set :twitter_client, client
  
  enable :logging
end

# main page containing map
get '/' do
  @mapbox_id = ENV['MAPBOX_ID']
  erb :accessibility_mapper, :locals => {:page => "mapper", :page_title => "Mapping accessible stations, elevator outages, bars, restaurants, shops, museums and more in Philadelphia"}
end

get '/routechecker' do
  erb :route_checker, :locals => {:page => "routechecker", :page_title => "Google maps accessible transit route checker"}
end

get '/about' do
  erb :about, :locals => {:page => "about", :page_title => "Making Philadelphia a more accessible city that embraces people of all ages and abilities."}
end

get '/privacy' do
  erb :privacy, :locals => {:page => "privacy", :page_title => "Privacy Policy."}
end

get '/n3rdstreet' do
  erb :n3rdstreet, :locals => {:page => "n3rdstreet", :page_title => "N3RD Street, Philadelphia Shops / Venues with Accessible Main Entrance/Accessibility Instructions Outside"}
end

get '/parks' do
  erb :parks, :locals => {:page => "parks", :page_title => "Independence National Historical Park, Philadelphia - Accessibility Guide"}
end

get '/help' do
  erb :help, :locals => {:page => "help", :page_title => "Help page for reporting and tracking accessibility problems."}
end

get '/parks/independence-national-historical-park-accessibility' do
  erb :parks_inde, :locals => {:page => "parks", :page_title => "Independence National Historical Park, Philadelphia - Accessibility Guide"}
end

# station details page
get '/station/:stationid' do
  station_arr = settings.STATIONS_COLLECTION.find({:_id => params[:stationid]}).to_a
  station_content_arr = settings.STATIONS_CONTENT_COLLECTION.find({:_id => params[:stationid]}).to_a
  outage_history = settings.OUTAGE_TRACKER_COLLECTION.find({"_id.stationId" => params[:stationid]}).to_a
  active_outage_arr = settings.OUTAGE_TRACKER_COLLECTION.find({"_id.stationId" => params[:stationid], "isActive" => true}).to_a
  if (station_arr.size==0) 
    status 404
    erb :oops_station, :locals => {:page => "oops_station", :page_title => "Station #{params[:stationid]} not found"}
  else
    station=station_arr[0]
    if (station_content_arr.size>0) then station_content=station_content_arr[0] else station_content=nil end
    if (active_outage_arr.size>0) then active_outage=active_outage_arr[0] else active_outage_arr=nil end
    @mapbox_id = ENV['MAPBOX_ID']
    erb :station, :locals => {:page => "station", :page_title => "Station accessibilty details for "  + station['stop_name'] + " - " + get_line_full_name(station), :station => station, :station_content => station_content,
      :line_name => get_line_full_name(station), :outageHistory => outage_history, :active_outage => active_outage}
  end
end

# get all station (and outage) metadata (AJAX request from main page in order to display map and outage info)
get '/septa/stations/line/:line' do
  content_type :json
  outages = {}
  begin
    outages = get_live_elevator_outages
  rescue JSON::ParserError => e
    outages["results"] = []
  end
  stations = settings.STATIONS_COLLECTION.find({:$or => settings.STATION_CODES_TO_NAMES.keys.map { | key | { key => "1" } } })
  stations_data_with_outages = {}
  stations_data_with_outages["line"] = "#{params[:line]}"
  stations_data_with_outages["stations"]=stations.to_a
  station_ids_with_outage = add_outages_to_stations(stations_data_with_outages, outages)
  end_date_stations_that_no_longer_have_outages(station_ids_with_outage)
  return stations_data_with_outages.to_json
end

get '/patco/elevator/outages' do
  content_type :json
  return get_patco_elevator_status_json
end

get '/septa/elevator/outages' do
  content_type :json
  return settings.OUTAGE_TRACKER_COLLECTION.find("isActive" => true).to_a.to_json
end

get '/septa/elevator/outagedaysbymonth/:stationid' do
  content_type :json
  return getDaysOfElevatorOutagesByMonthForStation(params[:stationid]).to_json
end

get '/septa/elevator/outageTotalsByStationForLast12Months' do
  content_type :json
  totalsForAllStations12Months = getLast12MonthsElevatorOutageTotalByStation()
  return totalsForAllStations12Months.to_json
end

# outage totals last 12 months across all septa stations
get '/septa/elevator/outagedayslast12months' do
  content_type :json
  months = getDaysOfElevatorOutagesByMonthAllStations()
  outagesByMonth = Hash.new(0)
  months.each do | month |
    outagesByMonth[month["_id"]["outageMonth"] + "/" + month["_id"]["outageYear"]] = month["totalDaysInMonthWithOutageIncidentReportedByOperator"]
  end
  # get last months outages
  outagesLast12Months = []
  prev_month_list_based_on_1st_current_month(0..11).each do | month_year |
    year = month_year.year
    month = month_year.month
    outagesLast12Months.unshift({"month"=>year.to_s + "-" + month.to_s.rjust(2,"0"),"outageDays"=>outagesByMonth[month.to_s.rjust(2,"0") + "/" + year.to_s]})
  end
  return outagesLast12Months.to_json
end

# outage totals last 12 months specific station
get '/septa/elevator/outagedayslast12months/:stationid' do
  content_type :json
  months = getDaysOfElevatorOutagesByMonthForStation(params[:stationid])
  outagesByMonth = Hash.new(0)
  months.each do | month |
    outagesByMonth[month["_id"]["outageMonth"] + "/" + month["_id"]["outageYear"]] = month["totalDaysInMonthWithOutageIncidentReportedByOperator"]
  end
  # get last months outages
  outagesLast12Months = []
  prev_month_list_based_on_1st_current_month(0..11).each do | month_year |
    year = month_year.year
    month = month_year.month
    outagesLast12Months.unshift({"month"=>year.to_s + "-" + month.to_s.rjust(2,"0"),"outageDays"=>outagesByMonth[month.to_s.rjust(2,"0") + "/" + year.to_s]})
  end
  return outagesLast12Months.to_json
end

get '/septa/elevator/outagedaysbyyearmonth' do
  content_type :json
  return getDaysOfElevatorOutagesByYearMonth().to_json
end

get '/septa/elevator/outagedaysbyyear' do
  content_type :json
  return getDaysOfElevatorOutagesByYear().to_json
end

get '/septa/elevator/dayswithoutagereport' do
  content_type :json
  stationsOutagesByDayCol = settings.mongo_db["stations_outages_by_day"]
  result = stationsOutagesByDayCol.find().sort({"stop_name" => 1, "line_code" => 1, "_id.outageYear" => 1, "_id.outageMonth" => 1, "_id.outageDay" => 1})
  result.to_a.to_json
end

get '/septa/elevator/dayswithoutagereport/:stationid' do
  content_type :json
  stationsOutagesByDayCol = settings.mongo_db["stations_outages_by_day"]
  result = stationsOutagesByDayCol.find({"_id.stationId" => params[:stationid]}).sort({"stop_name" => 1, "line_code" => 1, "_id.outageYear" => 1, "_id.outageMonth" => 1, "_id.outageDay" => 1})
  result.to_a.to_json
end

# make a call to yelp for wheelchair accessible businesses around given lat/lng
get '/yelp/wheelchairaccess/:lat/:lng/:radius' do
  consumer_key = ENV['YELP_CONSUMER_KEY']
  consumer_secret = ENV['YELP_CONSUMER_SECRET']
  token = ENV['YELP_TOKEN']
  token_secret = ENV['YELP_TOKEN_SECRET']
  api_host = 'api.yelp.com'
  consumer = OAuth::Consumer.new(consumer_key, consumer_secret, {:site => "http://#{api_host}"})
  access_token = OAuth::AccessToken.new(consumer, token, token_secret)
  path = "/v2/search?term=wheelchair+accessible&ll=#{params[:lat]},#{params[:lng]}&radius_filter=#{params[:radius]}&sort=1"
  yelpResults = access_token.get(path).body
  append_street_address_lat_lng(JSON.parse(yelpResults))
end

helpers do
  
  def add_outages_to_stations(stations_data_with_outages, outages)
    station_ids_with_outage = []
    stations_data_with_outages["stations"].each do | station_data |
      outages["results"].each do | outage |
        puts "comparing outage " + outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St') + " with " + station_data["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St') + " on line " + get_line_code(station_data)
        # have to remove hypens due to naming inconsistency and also abbreviate Street to St
        if station_data["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St').start_with?(outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St'))
          # stations matches, also have to check line
          line_code = get_line_code_using_name(outage["line"])
          if station_data[line_code] == "1"
            station_data["elevatorOutage"] = outage;
            # FOUND MATCH FOR OUTAGE... update the DB and object accordingly
            # archive the outage by date
            outage_by_day = build_outage_by_day(station_data, line_code)
            outage_today_already_in_db = settings.OUTAGES_BY_DAY_COLLECTION.find(outage_by_day).count
            puts "outage already in db " + outage_today_already_in_db.to_s
            if (outage_today_already_in_db == 0) then
              settings.OUTAGES_BY_DAY_COLLECTION.insert_one(outage_by_day)
            end
            # update/add to station_dataoutage tracker collection
            station_ids_with_outage << station_data["_id"]
            already_active_outage_array = settings.OUTAGE_TRACKER_COLLECTION.find("_id.stationId" => station_data["_id"], "isActive" => true).limit(1).to_a
            if (already_active_outage_array.size > 0)
              update_active_outage(already_active_outage_array[0])
              station_data["outageTracker"] = already_active_outage_array[0]
            else
              add_new_outage_and_alert(station_data, line_code)
            end
          end
        end
      end # end of outages iteration
    end # end of stations iteration
    station_ids_with_outage
  end
  
  def update_active_outage(already_active_outage)
    puts "updating active outage duration in Mongo for #{already_active_outage.inspect}"
    puts "#{Time.now} - #{already_active_outage["_id"]["outageStart"]}"
    mins_since_outage_start = ((Time.now - already_active_outage["_id"]["outageStart"])/60).to_i
    puts "mins_since_outage_start = " + mins_since_outage_start.to_s
    already_active_outage["duration"] = mins_since_outage_start
    settings.OUTAGE_TRACKER_COLLECTION.find({"_id"=>already_active_outage["_id"]}).update_one(already_active_outage)
  end
  
  def add_new_outage_and_alert(station_data, line_code)
    outage = build_outage(station_data, line_code)
    puts "adding new outage to Mongo #{outage.inspect}"
    settings.OUTAGE_TRACKER_COLLECTION.insert_one(outage)
    station_data["outageTracker"] = outage
    msg = "##{station_data['operator']}#{line_code} #elevatoroutage reported @ #{station_data["stop_name"]}: for latest see unlockphilly.com/station/#{outage['_id']['stationId']} #{Time.now.strftime("%b %e, %H:%M %p")} "
    send_alert_mail "UnlockPhilly: New elevator outage reported at " + station_data["stop_name"], msg
    settings.twitter_client.update(msg)
    outage
  end

  def end_date_stations_that_no_longer_have_outages(station_ids_with_outage)
    stations_with_active_outages = settings.OUTAGE_TRACKER_COLLECTION.find("isActive" => true).to_a
    stations_with_active_outages.each do | station_with_outage |
      if station_ids_with_outage.include? station_with_outage["_id"]["stationId"]
        puts "found active station outage in mongo that is still active #{station_with_outage.inspect}" 
        #do nothing
      else 
        puts "found active station outage that is no longer active, end-dating #{station_with_outage.inspect}" 
        station_with_outage["isActive"] = false
        mins_since_outage_start = ((Time.now - station_with_outage["_id"]["outageStart"])/60).to_i
        puts "mins_since_outage_start = " + mins_since_outage_start.to_s
        station_with_outage["duration"] = mins_since_outage_start
        station_with_outage["outageEnd"] = Time.now
        settings.OUTAGE_TRACKER_COLLECTION.find({"_id"=>station_with_outage["_id"]}).update_one(station_with_outage)
        mail_body = "Elevator outage ended at #{station_with_outage["stop_name"]} #{station_with_outage["line_code"]}"
        puts mail_body
        send_alert_mail "UnlockPhilly: Elevator outage ended at #{station_with_outage['stop_name']}", mail_body
      end
    end
  end

  def build_outage(station, line_code)
    outage = {}
    idOutageTracker = {}
    idOutageTracker["stationId"] = station["_id"]
    idOutageTracker["outageStart"] = Time.now
    outage["_id"] = idOutageTracker
    outage["duration"] = 0
    outage["isActive"] = true
    outage["outageEnd"] = nil
    outage["stop_name"] = station["stop_name"]
    outage["line_code"] = line_code
    outage
  end
  
  def build_outage_by_day (station, line_code)
    outage_by_day = {}
    idByDayDoc = {}
    idByDayDoc["stationId"] = station["_id"]
    todayDate = Date.today.to_s.split("-")
    idByDayDoc["outageYear"] = todayDate[0]
    idByDayDoc["outageMonth"] = todayDate[1]
    idByDayDoc["outageDay"] = todayDate[2]
    outage_by_day["_id"] = idByDayDoc
    outage_by_day["stop_name"] = station["stop_name"]
    outage_by_day["line_code"] = line_code
    outage_by_day
  end
  
  def prev_month_list_based_on_1st_current_month(prev_month_range)
    today = Date.today
    beg_of_current_month = today - today.day + 1
    prev_month_range.to_a.map { | prev_month_number | beg_of_current_month.prev_month(prev_month_number) }
  end
  
  def getLast12MonthsElevatorOutageTotalByStation()
    last12MonthDates = prev_month_list_based_on_1st_current_month(0..11)
    datesForMatch = []
    last12MonthDates.each do | date |
      datesForMatch << { "_id.outageYear" => "#{date.year}", "_id.outageMonth" => "#{date.month.to_s.rjust(2,"0")}" }
    end
    # TODO convert list of dates to array of hashes for '$or'
    settings.mongo_db["stations_outages_by_day"].find.aggregate([
      {
        "$match" => {"$or" =>  datesForMatch }
      },
      { 
        "$group" => {
            "_id" => { "stationId" => "$_id.stationId", "stop_name" => "$stop_name", "line_code" => "$line_code"},
            "totalDaysOutageReported" => { "$sum" => 1 }
       }
      },
      { "$sort" =>
        {
          "totalDaysOutageReported" => -1
        }
      }
    ]).to_a
  end
  
  def getDaysOfElevatorOutagesByMonthAllStations()
    settings.mongo_db["stations_outages_by_day"].aggregate([
      { "$group" => 
        { 
          "_id" => {"outageYear" => "$_id.outageYear", "outageMonth" => "$_id.outageMonth"},
          "totalDaysInMonthWithOutageIncidentReportedByOperator" => { "$sum" => 1 }
        }
      },
      { "$sort" => 
        {
          "_id.outageYear" => -1, "_id.outageMonth" => -1
        }
      }
    ]).to_a
  end
  
  def getDaysOfElevatorOutagesByMonthForStation(stationId)
    settings.mongo_db["stations_outages_by_day"].find.aggregate([
      { "$match" => {"_id.stationId" => stationId } },
      { "$group" => 
        { 
          "_id" => {"stop_name" => "$stop_name", "outageYear" => "$_id.outageYear", "outageMonth" => "$_id.outageMonth"},
          "totalDaysInMonthWithOutageIncidentReportedByOperator" => { "$sum" => 1 }
        }
      },
      { "$sort" => 
        {
          "_id.outageYear" => -1, "_id.outageMonth" => -1
        }
      }
    ]).to_a
  end
  
  def getDaysOfElevatorOutagesByYearMonth()
    settings.mongo_db["stations_outages_by_day"].aggregate([
      { "$group" => 
        { 
          "_id" => {"stop_name" => "$stop_name", "outageYear" => "$_id.outageYear", "outageMonth" => "$_id.outageMonth"},
          "totalDaysInMonthWithOutageIncidentReportedByOperator" => { "$sum" => 1 }
        }
      },
      { "$sort" => 
        {
          "totalDaysInMonthWithOutageIncidentReportedByOperator" => -1
        }
      }
    ]).to_a
  end
  
  def getDaysOfElevatorOutagesByYear()
    settings.mongo_db["stations_outages_by_day"].aggregate([
      { "$group" => 
        { 
          "_id" => {"stop_name" => "$stop_name", "outageYear" => "$_id.outageYear"},
          "totalDaysInYearWithOutageIncidentReportedByOperator" => { "$sum" => 1 }
        }
      },
      { "$sort" => 
        {
          "totalDaysInYearWithOutageIncidentReportedByOperator" => -1
        }
      }
    ]).to_a
  end
  
  def get_live_elevator_outages()
    JSON.parse(getElevatorOutagesFromSeptaJson())
    #JSON.parse(getElevatorOutagesFromFileForTesting())
  end
  
  # sample response from SEPTA {"meta":{"elevators_out":1,"updated":"2013-09-26 13:31:57"},"results":[{"line":"Norristown High Speed Line","station":"Norristown Transportation Center","elevator":"Street Level","message":"No access to\/from station","alternate_url":"http:\/\/www.septa.org\/access\/alternate\/nhsl.html#ntc"}]}
  def getElevatorOutagesFromSeptaJson()
    begin
      return RestClient.get settings.septaElevatorOutagesUrl
    rescue => e
      puts e.response
      return '{"results": []}'
    end
  end
  
  def getElevatorOutagesFromFileForTesting()
    return IO.read('testdata/elevator_outage_json_examples/outage4.json')
  end
  
  def get_line_code_using_name(line)
    settings.STATION_CODES_TO_SEARCH_STRINGS.each { | key, value |
      if (line.include?(value))
        return key
      end
    }
    return ""
  end
  
  def get_line_code(station)
    settings.STATION_CODES_TO_NAMES.keys.map { | code |
       if station[code] == "1" 
         return code
       end
    }
    return "";
  end
  
  def get_line_full_name(station)
    settings.STATION_CODES_TO_NAMES[get_line_code(station)]
  end
  
  def send_alert_mail(subject, body)
    if (ENV['MAIL_ACTIVE'] == 'true')
      message = Mail.new do
        from            ENV['ADMIN_EMAIL_FROM']
        to              ENV['ADMIN_EMAIL_TO']
        subject         subject
        body            body
        delivery_method Mail::Postmark, :api_key => ENV['POSTMARK_API_KEY']
      end
      message.deliver
    else
      logger.info 'email alerts turned off; check configuration'
      msg = "Subject: #{subject}\nBody: #{body}"
      logger.info msg
    end
  end
  
  # Given a hash of Yelp results, append the latLng values of each address to each result
  def append_street_address_lat_lng(yelpResults)
    yelpResults["businesses"].each_index do |i|
      addr1 = yelpResults["businesses"][i]["location"]["address"][0]
      city = yelpResults["businesses"][i]["location"]["city"]
      stateCode = yelpResults["businesses"][i]["location"]["state_code"]
      countryCode = yelpResults["businesses"][i]["location"]["country_code"]
      if (addr1 && city && stateCode && countryCode)
        singleLineAddress = addr1 + ", " + city + ", " + stateCode + ", " + countryCode
        address = singleLineAddress
        if address
           address = address.gsub(" ", "%20")
        end
        addressLatLng = get_geo_json(address)
        logger.info(addressLatLng)
        yelpResults["businesses"][i]["location"]["geocoding"] = addressLatLng
      else
        latLng = {"lng" => 0,"lat" => 0}
        latLng["_id"] = address
        yelpResults["businesses"][i]["location"]["geocoding"] = latLng
      end
    end
    return yelpResults.to_json
  end
  
  # For addresses in the form '1231-1232 Philadephia Ave', trim the street range such that mapquest can process address (ie -> 1232 Philadelphia Ave) 
  def remove_hyphen_from_house_number(address)
    index = address =~ /(\d)-(\d)/
    if index
      address = address[index + 2..-1]
    end
    return address
  end
  
  # Converts a street address to a GeoJSON object via the mapquest API
  def get_geo_json(address)  
    geocodes_collection = settings.mongo_db['geocodes']
    cache_result_arr = geocodes_collection.find({:_id => address}).limit(1).to_a
    if cache_result_arr.size==0 # address doesn't exist in global variable
      mapquestKey = ENV['MAPQUEST_API_KEY']
      geocodeRequestUri = "http://open.mapquestapi.com/geocoding/v1/address?key=#{mapquestKey}&location=#{address}"
      geoCodeResponse = RestClient.get geocodeRequestUri
      jsonResults = JSON.parse(geoCodeResponse)
      if jsonResults['info']['statuscode'] == 403 # Request failed
        latLng = {"lng" => 0,"lat" => 0}
        latLng["_id"] = address
        geocodes_collection.insert_one(latLng)
      elsif jsonResults['results'][0]['locations'].length > 0
        latLng = jsonResults['results'][0]['locations'][0]['latLng']
        $yelpAddressLatLng[address] = latLng
        latLng["_id"] = address
        geocodes_collection.insert_one(latLng)
      else
        latLng = {"lng" => 0,"lat" => 0}
        latLng["_id"] = address
        geocodes_collection.insert_one(latLng)
      end
    else # address exists in global variable
      latLng = cache_result_arr[0]
    end
    return latLng
  end
  
  def get_patco_elevator_status_json()
    url = 'http://www.ridepatco.org/schedules/alerts.asp'
    doc = Nokogiri::HTML(open(url))
    all_status=[]
    elev_status=[]
    doc.css(".copy img").each do |item|
      all_status << item['alt']
    end
    date_from_site = doc.css("i").to_s[194..-5].gsub(/>/, '').strip
    date_formatted = DateTime.strptime(date_from_site, '%m/%d/%Y %H:%M:%S %p')
    date_updated = date_formatted.strftime '%F %T'
    elev_status << all_status[0] << all_status[3] << all_status[5] << all_status[10] << all_status[12] << all_status[14] << all_status[16] << all_status[18] << all_status[20] << all_status[21] << all_status[23]
    elev_map = ["PATCO240", "PATCO242", "PATCO242", "PATCO246", "PATCO247", "PATCO247", "PATCO249", "PATCO249", "PATCO250", "PATCO250", "PATCO252"]
    outages=[]
    elev_status.each_index do |i|
      if elev_status[i] == "No"
        outages << {"line"=>"Patco", "station"=>elev_map[i], "elevator"=>"E", "message"=>"Out of service"}
      end
    end
    JSON.generate ["meta" => {"elevators_out" => outages.count, "updated" => date_updated}, "results" => outages]
  end

end

