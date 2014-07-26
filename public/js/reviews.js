var buttonToReset = null;

function showlocation(searchType) {
    // One-shot position request.
    console.log(searchType);
    var apiAddress = "";
    $("#loadingImage").show();
    navigator.geolocation.getCurrentPosition(function(position) {
	    if (searchType == 'nearby') { 
	    	apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + 
	    		position.coords.latitude + "," + position.coords.longitude + 
	    		"&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
	    }
	    else if(searchType == 'search') {
	    	apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + 
	    		position.coords.latitude + "," + position.coords.longitude + "&intend=global&query=" + $('#searchquery').val() + 
	    		"&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
	    }
	    fetchData(apiAddress);
    });
}

function fetchData(apiAddress) {
    $('.results').empty();
    $.getJSON(apiAddress, function(data) {
      	  console.log(data);
          $('#yelp-results').html(buildResults(data));
          $.each(data.response.venues, function(i,venues){
            var contents = "";
            contents += '<div class="col-xs-8 col-sm-8 col-md-10">';
            contents += '<h4>' + venues.name + '</h4>';
            if(venues.location.address != null) contents += venues.location.address + ' ';
            if(venues.location.city != null) contents += venues.location.city + ' ';
            if(venues.location.state != null) contents += venues.location.state + ' ';
            if(venues.location.postalCode != null) contents += venues.location.postalCode + ' ';
            contents += '<br /><br />';
            contents += '<button class="btn btn-primary"><a style="color:#fff" href="/postreviews/' + venues.id +'">Post Review</a></button>';
            contents += '</div>';
            contents += '<div style="clear:both"></div><br />';
            $('.results').append(contents);
            buttonToReset.button('reset')
        });
    });
}

function buildResults(data) {
	var resultsHtml = "<small><ul class='list-group'>";
	$.each(data.response.venues, function(i,venue) {
		resultsHtml += "<li class='list-group-item'>";
		resultsHtml += "<a href='/postreviews/" + venue.id + "'>" + venue.name + "</a></h4><br/>";
		if(venue.location.address != null) resultsHtml += venue.location.address + ' ';
        if(venue.location.city != null) resultsHtml += venue.location.city + ' ';
        if(venue.location.state != null) resultsHtml += venue.location.state + ' ';
        if(venue.location.postalCode != null) resultsHtml += venue.location.postalCode + ' ';
	});
	if (data.response.venues.length == 0) {
		resultsHtml += "<li class='list-group-item'>No accessible businesses found close to " + name + "<a/>";
	}
	
	return resultsHtml + "</ul></small>";
	
}


$(document).ready(function() {
    var imgSrc = "";
    var contents = "";      
    
    $('#loading-example-btn').click(function () {
		buttonToReset = $(this);
		buttonToReset.button('loading');
		showlocation('nearby');
	});
      
    $.ajax({
      url: 'https://api.foursquare.com/v2/venues/'+venueId+'/photos?&limit=1&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data2) {
      	console.log(data2);
         if (data2.response.photos.count > 0) {
             imgSrc = '<img src="' + data2.response.photos.items[0].prefix + '140x140' + data2.response.photos.items[0].suffix + '" class="img-thumbnail">';
         }
         else {
             imgSrc = '<img src="/images/no_image_available.gif" width="140" class="img-thumbnail">';
         }
      }
    });
    contents += imgSrc + '<br />';
    
    $.ajax({
      url: 'https://api.foursquare.com/v2/venues/' + venueId + '?&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data) {
      	console.log(data);
        var venues = data.response.venue;
        contents += '<h4>' + venues.name + '</h4>';
        if(venues.location.address != null) contents += venues.location.address + ' ';
        if(venues.location.city != null) contents += venues.location.city + ' ';
        if(venues.location.state != null) contents += venues.location.state + ' ';
        if(venues.location.postalCode != null) contents += venues.location.postalCode + ' ';
        $("#heading").append(venues.name);
      }
    });
    $("#venueheader").append(contents);
});