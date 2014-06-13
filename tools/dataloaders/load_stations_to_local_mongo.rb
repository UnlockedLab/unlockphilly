#!/usr/bin/env ruby

# load a septa csv file containing stations into a Mongo database

require 'rubygems'
require 'mongo'
require 'rest_client'
require 'json'
require 'csv'
require 'pp'
require 'dotenv'

#Dotenv.load

include Mongo

# local
mongoServer = "localhost"
mongoPort = 27017
dbName = "unlockphilly"

puts "Connecting to Mongo #{mongoServer}:#{mongoPort}"
@client = MongoClient.new(mongoServer, mongoPort)
@db     = @client[dbName]
@coll   = @db['stations']

@coll.remove

arr_of_arrs = CSV.read("../../datasets/stations/rail_stops_with_lines.csv")

#puts response
result = []
keys = arr_of_arrs[0]

arr_of_arrs.drop(1).each do | line |
  iter=0
  assoc={}
  line.each do |v|
    assoc[keys[iter]] = v
    iter += 1
  end
  result.push assoc
end

puts "inserting stations"
@coll.insert(result)

puts " #{@coll.count} result."

