// List of days with outages for station

db.stations_outages_by_day.find({"_id.stationId" : "21532"}).sort({"_id.outageYear" : 1, "_id.outageMonth" : 1, "_id.outageDay" : 1});

// All station outages

db.stations_outages_by_day.find().sort({"_id.stationId" : 1, "_id.outageYear" : 1, "_id.outageMonth" : 1, "_id.outageDay" : 1});