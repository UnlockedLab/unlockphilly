function showlocation(searchType) {
    // One-shot position request.
    var apiAddress = "";
    $("#geoLocating").show();
    $('.results').empty();
    navigator.geolocation.getCurrentPosition(function(position) {
    	$("#geoLocating").hide();
    	$("#loadingImage").show();
	    if(searchType == 'nearby') {
	    	apiAddress = "/xhrnearbyplaces/" + position.coords.latitude + "/" + position.coords.longitude;
	    }
	    else if(searchType == 'search') { 
	    	apiAddress = "/xhrnearbyplacessearch/" + position.coords.latitude + "/" + position.coords.longitude + "/" + $('#searchquery').val();
	    }
	    fetchData(apiAddress);
    });
}

function fetchData(apiAddress) {
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
});