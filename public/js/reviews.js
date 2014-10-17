function showlocation(searchType) {
		var apiAddress = "";
		$("#loadingImage").hide();
		$("#geoLocating").hide();
		$('.results').empty();
		if (searchType == 'nearby') {
			// geolocate and nearby
			$("#geoLocating").show();
			navigator.geolocation.getCurrentPosition(function(position) {
				$("#geoLocating").hide();
				apiAddress = "/xhrnearbyplaces/" + position.coords.latitude + "/" + position.coords.longitude;
				fetchData(apiAddress);
			});
		} else if (searchType == 'search' && ($('#searchquery').val() + "").length > 0) {
			// search text in area
			apiAddress = "/xhrplacesnearnamedplace/" + $('#searchquery').val() + "/" + "Philadelphia,PA";
			fetchData(apiAddress);
		} else {
			// anything else
			showNoResults();
		}

}

function fetchData(apiAddress) {
	$("#loadingImage").hide();
    $.ajax({
      url: apiAddress,
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data) {
        $("#loadingImage").hide();
          if (data.response.venues.length == 0) {
          	showNoResults;
          } else {
          	  var contents = "";
	          $.each(data.response.venues, function(i,venue){
	          	contents = "";
	            contents += '<div class="row text-center">';
	            contents += '<h4><a alt="Click to assess accessibility" href="/assess/' + venue.id +'">' + venue.name + ' (' + ((venue.categories[0] != null) ? venue.categories[0].name : '?') + ')</a></h4>';
	            if(venue.location.address != null) contents += venue.location.address + ' ';
	            if(venue.location.city != null) contents += venue.location.city + ' ';
	            if(venue.location.state != null) contents += venue.location.state + ' ';
	            if(venue.location.postalCode != null) contents += venue.location.postalCode + '';
	            if(venue.location.distance != null) contents += '<br>(approx ' + Math.floor(venue.location.distance*3.28084) + ' feet from your location)';
	            contents += '</div>';
	            contents += '<div style="clear:both"></div><br />';
	            console.log('appending ' + contents)
	            $('.results').append(contents);
              });
          }
      }
    });
}

function showNoResults() {
	var noResults = ""
    noResults += '<div class="row text-center">';
    noResults += '<h4>No results, try a different search term</h4></div>';
    $('.results').append(noResults);
}

$(document).ready(function() {
    var imgSrc = "";
    var contents = "";        
});