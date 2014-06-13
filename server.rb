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

include Mongo

$stdout.sync = true

configure :production do
  require 'newrelic_rpm'
end

$yelpAddressLatLng = {} # latLng of addresses from Yelp

configure do
  db_details = URI.parse(ENV['MONGOHQ_URL'])
  conn = MongoClient.new(db_details.host, db_details.port)
  db_name = db_details.path.gsub(/^\//, '')
  db = conn.db(db_name)
  db.authenticate(db_details.user, db_details.password) unless (db_details.user.nil? || db_details.user.nil?)
  set :mongo_db, db
  set :appUrl, "http://www.unlockphilly.com"
  set :septaElevatorOutagesUrl, 'http://www3.septa.org/hackathon/elevator/'
  enable :logging
  puts "dbconnection successful to #{ENV['MONGOHQ_URL']}"
end

get '/' do
  if request.host.include? 'herokuapp'
    logger.info 'redirecting from ' + request.host + ' to ' + settings.appUrl
    redirect settings.appUrl, 301
  end
  @mapbox_id = ENV['MAPBOX_ID']
  erb :accessibility_mapper, :locals => {:page => "mapper", :page_title => "Mapping accessible stations, elevator outages, bars, restaurants, shops, museums and more in Philadelphia"}
end

get '/station/:stationid' do
  stationsCol = settings.mongo_db['septa_stations']
  stationsContentCol = settings.mongo_db['station_content']
  outageTrackerCol = settings.mongo_db['stations_outage_tracker']
  station = stationsCol.find_one({:_id => params[:stationid]})
  stationContent = stationsContentCol.find_one({:_id => params[:stationid]})
  outageHistoryArray = outageTrackerCol.find({"_id.stationId" => params[:stationid]}).sort("_id.outageStart" => :asc).to_a
  erb :station, :locals => {:page => "station", :page_title => "Station accessibilty details for "  + station['stop_name'] + " - " + getLineFullName(station), :station => station, :station_content => stationContent,
    :line_name => getLineFullName(station), :outageHistory => outageHistoryArray}
end

# get all station metadata - will include details of elevator outage (if exists)
get '/septa/stations/line/:line' do
  content_type :json
  outages = {}
  matchedOutageStationIds = []
  stationOutageTrackerCol = settings.mongo_db['stations_outage_tracker']
  begin
    outages = getElevatorOutages()
  rescue JSON::ParserError => e
    outages["results"] = []
  end
  stationsCol = settings.mongo_db['septa_stations']
  if (params[:line] == "ALL")
    result = stationsCol.find({:$or => [{:MFL => "1"}, {:BSS => "1"}, {:NHSL => "1"}, {:PATCO => "1"}] })
  else
    result = stationsCol.find({params[:line] => "1"})
  end
  doc = {}
  doc["line"] = "#{params[:line]}"
  doc["stations"]=result.to_a
  doc["stations"].each_with_index do | station |
    outages["results"].each do | outage |
      puts "comparing outage " + outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St') + " with " + station["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St') + " on line " + getLineName(station)
      # have to remove hypens due to naming inconsistency and also abbreviate Street to St
      if station["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St').start_with?(outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St'))
        lineCode = getLineCode(outage["line"])
        puts "station match, now checking line #{outage['line']} using code #{lineCode}"
        if station[lineCode] == "1"
          
          puts "found match!"
          station["elevatorOutage"] = outage;  
          
          # FOUND MATCH FOR OUTAGE... update the DB and object accordingly
          
          # archive the outage by date
          stationOutagesByDayCol = settings.mongo_db['stations_outages_by_day']
          mongoDocOutageByDay = {}
          idByDayDoc = {}
          idByDayDoc["stationId"] = station["_id"]
          todayDate = Date.today.to_s.split("-")
          idByDayDoc["outageYear"] = todayDate[0]
          idByDayDoc["outageMonth"] = todayDate[1]
          idByDayDoc["outageDay"] = todayDate[2]
          mongoDocOutageByDay["_id"] = idByDayDoc
          mongoDocOutageByDay["stop_name"] = station["stop_name"]
          mongoDocOutageByDay["line_code"] = lineCode
          stationOutagesByDayCol.save(mongoDocOutageByDay)
          
          # add to/update station outage tracker collection
          
          matchedOutageStationIds.push station["_id"]
          result = stationOutageTrackerCol.find_one("_id.stationId" => station["_id"], "isActive" => true)
          if (result)
            # update outage duration
            puts "updating outage duration in Mongo for #{result.inspect}"
            puts "#{Time.now} - #{result["_id"]["outageStart"]}"
            minsSinceOutageStart = ((Time.now - result["_id"]["outageStart"])/60).to_i
            puts "minsSinceOutageStart = " + minsSinceOutageStart.to_s
            result["duration"] = minsSinceOutageStart
            stationOutageTrackerCol.save(result)
            station["outageTracker"] = result 
          else
            # add outage
            mongoDocOutageTracker = {}
            idOutageTracker = {}
            idOutageTracker["stationId"] = station["_id"]
            idOutageTracker["outageStart"] = Time.now
            mongoDocOutageTracker["_id"] = idOutageTracker
            mongoDocOutageTracker["duration"] = 0
            mongoDocOutageTracker["isActive"] = true
            mongoDocOutageTracker["outageEnd"] = nil
            mongoDocOutageTracker["stop_name"] = station["stop_name"]
            mongoDocOutageTracker["line_code"] = lineCode
            puts "adding new outage to Mongo #{mongoDocOutageTracker.inspect}"
            stationOutageTrackerCol.insert(mongoDocOutageTracker)
            station["outageTracker"] = mongoDocOutageTracker
            sendAlertMail "UnlockPhilly: New elevator outage reported at " + station["stop_name"], mongoDocOutageTracker.inspect
          end 
          puts result.inspect
        end
      end
    end # end out outages iteration
    #end
  end # end of stations iteration
  # endDate stations that no longer have outages
  stationsWithActiveOutages = stationOutageTrackerCol.find("isActive" => true).to_a
  stationsWithActiveOutages.each do | stationWithOutage |
    if matchedOutageStationIds.include? stationWithOutage["_id"]["stationId"]
      puts "found active station outage in mongo that is still active #{stationWithOutage.inspect}" 
    else 
      puts "found active station outage that is no longer active, endDating #{stationWithOutage.inspect}" 
      stationWithOutage["isActive"] = false
      minsSinceOutageStart = ((Time.now - stationWithOutage["_id"]["outageStart"])/60).to_i
      puts "minsSinceOutageStart = " + minsSinceOutageStart.to_s
      stationWithOutage["duration"] = minsSinceOutageStart
      stationWithOutage["outageEnd"] = Time.now
      stationOutageTrackerCol.save(stationWithOutage)
      sendAlertMail "UnlockPhilly: Elevator outage ended at #{stationWithOutage['stop_name']}", stationWithOutage.inspect
    end
  end
  return doc.to_json
end

get '/patco/elevator/outages' do
  content_type :json
  return getPatcoElevatorStatusJson
end

get '/septa/elevator/outages' do
  content_type :json
  stationOutageTrackerCol = settings.mongo_db['stations_outage_tracker']
  return stationOutageTrackerCol.find("isActive" => true).to_a.to_json
end

def getElevatorOutages()
  JSON.parse(getElevatorOutagesFromSeptaJson())
  #JSON.parse(getElevatorOutagesFromFileForTesting())
end

# sample response from SEPTA {"meta":{"elevators_out":1,"updated":"2013-09-26 13:31:57"},"results":[{"line":"Norristown High Speed Line","station":"Norristown Transportation Center","elevator":"Street Level","message":"No access to\/from station","alternate_url":"http:\/\/www.septa.org\/access\/alternate\/nhsl.html#ntc"}]}
def getElevatorOutagesFromSeptaJson()
  return RestClient.get settings.septaElevatorOutagesUrl
end

def getElevatorOutagesFromFileForTesting()
  return IO.read('data/elevator_outage_json_examples/outage1.json')
end

def getLineCode(line)
  if (line.include?('Broad'))
    return "BSS"
  elsif (line.include?('Market'))
    return "MFL"
  elsif (line.include?('Norris'))
    return "NHSL"
  end
  return "";
end

def getLineName(station)
  if station["BSS"] == "1"
    return "BSS"
  elsif station["MFL"] == "1"
    return "MFL"
  elsif station["NHSL"] == "1"
    return "NHSL"
  elsif station["PATCO"] == "1"
    return "PATCO"
  end
  return "";
end

def getLineFullName(station)
  if station["BSS"] == "1"
    return "Broad Street Subway Line (SEPTA)"
  elsif station["MFL"] == "1"
    return "Market Frankford Line (SEPTA)"
  elsif station["NHSL"] == "1"
    return "Norristown High Speed Line (SEPTA)"
  elsif station["PATCO"] == "1"
    return "PATCO High Speed Line"
  end
  return "";
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
  appendStreetAddressLatLng(JSON.parse(yelpResults))
end



def sendAlertMail(subject, body)
  message = Mail.new do
    from            ENV['ADMIN_EMAIL_FROM']
    to              ENV['ADMIN_EMAIL_TO']
    subject         subject
    body            body
    delivery_method Mail::Postmark, :api_key => ENV['POSTMARK_API_KEY']
  end
  message.deliver
end

# Given a hash of Yelp results, append the latLng values of each address to each result
def appendStreetAddressLatLng(yelpResults)
  yelpResults["businesses"].each_index do |i|
    multilineAddress = yelpResults["businesses"][i]["location"]["display_address"]
    singleLineAddress = multilineAddress.join(" ")
    address = removeHyphenFromHouseNumber(singleLineAddress)
    if address
       address = address.gsub(" ", "%20")
    end
    addressLatLng = getGeoJSON(address)
    yelpResults["businesses"][i]["location"]["geocoding"] = addressLatLng
 #   puts yelpResults["businesses"][i]["location"]
  end
  return yelpResults.to_json
end

# For addresses in the form '1231-1232 Philadephia Ave', trim the street range such that mapquest can process address (ie -> 1232 Philadelphia Ave) 
def removeHyphenFromHouseNumber(address)
  index = address =~ /(\d)-(\d)/
  if index
    address = address[index + 2..-1]
  end
  return address
end

# Converts a street address to a GeoJSON object via the mapquest API
def getGeoJSON(address)  
  if $yelpAddressLatLng[address] == nil # address doesn't exist in global variable
    mapquestKey = ENV['MAPQUEST_API_KEY']
    geocodeRequestUri = "http://www.mapquestapi.com/geocoding/v1/address?key=#{mapquestKey}&location=#{address}"
    geoCodeResponse = RestClient.get geocodeRequestUri
    jsonResults = JSON.parse(geoCodeResponse)
    if jsonResults['info']['statuscode'] == 403 # Request failed
      latLng = {"lng" => 0,"lat" => 0}
    elsif jsonResults['results'][0]['locations'].length > 0
       latLng = jsonResults['results'][0]['locations'][0]['latLng']
       $yelpAddressLatLng[address] = latLng
    else
      latLng = {"lng" => 0,"lat" => 0}
    end
  
  else # address exists in global variable
    puts "#{address} in cache using it"
    latLng = $yelpAddressLatLng[address]
  end
  return latLng
end

def getPatcoElevatorStatusJson()
  url = 'http://www.ridepatco.org/schedules/alerts.asp'
  doc = Nokogiri::HTML(open(url))

  all_status=[]
  elev_status=[]

  doc.css(".copy img").each do |item|
    all_status << item['alt']
  end

  elev_status << all_status[0] << all_status[3] << all_status[5] << all_status[10] << all_status[12] << all_status[14] << all_status[16] << all_status[18] << all_status[20] << all_status[21] << all_status[23]

  elev_map = ["PATCO240", "PATCO242", "PATCO242", "PATCO246", "PATCO247", "PATCO247", "PATCO249", "PATCO249", "PATCO250", "PATCO250", "PATCO252"]

  outages=[]
  elev_status.each_index do |i|
    if elev_status[i] == "No"
      outages << {"line"=>"Patco", "station"=>elev_map[i], "elevator"=>"E", "message"=>"Out of service"}
    end
  end

  JSON.generate ["meta" => {"elevators_out" => outages.count, "updated" => Time.now}, "results" => outages]
end



