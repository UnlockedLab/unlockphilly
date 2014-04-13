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

include Mongo

$stdout.sync = true

configure :production do
  require 'newrelic_rpm'
end

configure do
  db_details = URI.parse(ENV['MONGOHQ_URL'])
  conn = MongoClient.new(db_details.host, db_details.port)
  db_name = db_details.path.gsub(/^\//, '')
  db = conn.db(db_name)
  db.authenticate(db_details.user, db_details.password) unless (db_details.user.nil? || db_details.user.nil?)
  set :mongo_db, db
  set :appUrl, "http://www.unlockphilly.com"
  enable :logging
  puts "dbconnection successful to #{ENV['MONGOHQ_URL']}"
end

get '/' do
  if request.host.include? 'herokuapp'
    logger.info 'redirecting from ' + request.host + ' to ' + settings.appUrl
    redirect settings.appUrl, 301
  end
  erb :unlock_philadelphia
end

# get all station metadata - will include details of elevator outage (if exists)
get '/septa/stations/line/:line' do
  content_type :json
  outages = {}
  begin
    outages = JSON.parse(getElevatorOutagesFromSeptaJson())
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
  doc["stations"].each_with_index do | station, i |
    outages["results"].each do | outage |
      puts "comparing outage " + outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St') + " with " + station["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St')
      # have to remove hypens due to naming inconsistency and also abbreviate Street to St
      if station["stop_name"].gsub(/-/, ' ').gsub(/Street/, 'St').include?(outage["station"].gsub(/-/, ' ').gsub(/Street/, 'St'))
        puts "found match!"
        doc["stations"][i]["elevatorOutage"] = outage;
      end
    end
  end
  return doc.to_json
end

get '/septa/elevator/outages' do
  content_type :json
  begin
    return JSON.parse(getElevatorOutagesFromSeptaJson()).to_json
  rescue JSON::ParserError => e
    error = {}
    error['errorMessage'] = "Septa elevator outage information out of service";
    return error.to_json
  end
end

# sample response from SEPTA {"meta":{"elevators_out":1,"updated":"2013-09-26 13:31:57"},"results":[{"line":"Norristown High Speed Line","station":"Norristown Transportation Center","elevator":"Street Level","message":"No access to\/from station","alternate_url":"http:\/\/www.septa.org\/access\/alternate\/nhsl.html#ntc"}]}
def getElevatorOutagesFromSeptaJson()
  uri = "http://www3.septa.org/hackathon/elevator/"
  response = RestClient.get uri
  return response;
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
  access_token.get(path).body
end
