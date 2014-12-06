// Outage days by Station/Year/Month

db.stations_outages_by_day.aggregate([
  { 
    $group: {
      "_id" : { stop_name : "$stop_name", outageYear : "$_id.outageYear", outageMonth : "$_id.outageMonth"},
      "totalDaysOutageReported" : { $sum :1 }
    }
  },
  { $sort :
       {
         totalDaysOutageReported : -1
       }
   }
]);

// Outage days by Station/Year

db.stations_outages_by_day.aggregate([
  { 
    $group: {
      "_id" : { stop_name : "$stop_name" , line_code : "$line_code", outageYear : "$_id.outageYear"},
      "totalDaysOutageReported" : { $sum :1 }
    }
  },
  { $sort :
       {
         totalDaysOutageReported : -1
       }
   }
]);

// Outage days by Month for given station ID

db.stations_outages_by_day.aggregate([
  {
    $match : { "_id.stationId" : "21532" }
  },
  { 
    $group: {
      "_id" : { stop_name : "$stop_name", outageYear : "$_id.outageYear", outageMonth : "$_id.outageMonth"},
      "totalDaysOutageReported" : { $sum :1 }
    }
  },
  { $sort :
       {
         "_id.outageYear" : 1, "_id.outageMonth" : 1
       }
   }
]);