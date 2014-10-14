function showlocation(searchType) {
    // One-shot position request.
    var apiAddress = "";
    $("#loadingImage").show();
    navigator.geolocation.getCurrentPosition(function(position) {
    if(searchType == 'nearby') {
    	apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + 
    		position.coords.latitude + "," + position.coords.longitude + 
    		"&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
    }
    else if(searchType == 'search') { 
    	apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + position.coords.latitude 
    		+ "," + position.coords.longitude + "&intend=global&limit=10&query=" 
    		+ $('#searchquery').val() + "&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
    }
    fetchData(apiAddress);
    });
}

function fetchData(apiAddress) {
    $('.results').empty();
    $.ajax({
      url: apiAddress,
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data) {
        $("#loadingImage").hide();
          $.each(data.response.venues, function(i,venues){
            var contents = "";
            contents += '<div class="row text-center">';
            contents += '<h4><a alt="Click to assess accessibility" href="/assess/' + venues.id +'">' + venues.name + ' (' + venues.categories[0].name + ')</a></h4>';
            if(venues.location.address != null) contents += venues.location.address + ' ';
            if(venues.location.city != null) contents += venues.location.city + ' ';
            if(venues.location.state != null) contents += venues.location.state + ' ';
            if(venues.location.postalCode != null) contents += venues.location.postalCode + '';
            if(venues.location.distance != null) contents += '<br>(approx ' + Math.floor(venues.location.distance*3.28084) + ' feet from your location)';
            contents += '</div>';

            contents += '<div style="clear:both"></div><br />';
            $('.results').append(contents);
        });
      }
    });
}

$(document).ready(function() {
    var imgSrc = "";
    var contents = "";        
    // $.ajax({
      // url: 'https://api.foursquare.com/v2/venues/'+venueId+'/photos?&limit=1&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
      // dataType: 'json',
      // async: false,
      // cache: false,
      // success: function(data2) {
         // if (data2.response.photos.count > 0) {
             // imgSrc = '<img src="' + data2.response.photos.items[0].prefix + '140x140' + data2.response.photos.items[0].suffix + '" class="img-thumbnail">';
         // }
         // else {
             // imgSrc = '<img src="/images/no_image_available.gif" width="140" class="img-thumbnail">';
         // }
      // }
    // });
    // contents += imgSrc + '<br />';
    
    $.ajax({
      url: 'https://api.foursquare.com/v2/venues/' + venueId + '?&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data) {
        var venues = data.response.venue;
        //contents += '<h4>' + venues.name + '</h4>';
        // if(venues.location.address != null) contents += venues.location.address + ' ';
        // if(venues.location.city != null) contents += venues.location.city + ' ';
        // if(venues.location.state != null) contents += venues.location.state + ' ';
        // if(venues.location.postalCode != null) contents += venues.location.postalCode + ' ';
        $("#heading").append(venues.name + " (" + venues.categories[0].name + ")");
      }
    });
    $("#venueheader").append(contents);
});