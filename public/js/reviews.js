function showlocation(searchType) {
    // One-shot position request.
    alert(searchType);
    var apiAddress = "";
    $("#loadingImage").show();
    navigator.geolocation.getCurrentPosition(function(position) {
    if(searchType == 'nearby') apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + position.coords.latitude + "," + position.coords.longitude + "&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
    else if(searchType == 'search') apiAddress = "https://api.foursquare.com/v2/venues/search?ll=" + position.coords.latitude + "," + position.coords.longitude + "&intend=global&query=" + $('#searchquery').val() + "&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140716";
    fetchData(apiAddress);
    });
}

function test() {
    alert('oop');
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
            $.ajax({
              url: 'https://api.foursquare.com/v2/venues/'+venues.id+'/photos?&limit=1&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
              dataType: 'json',
              async: false,
              cache: false,
              success: function(data2) {
                 var imgSrc = "";
                 if (data2.response.photos.count > 0) {
                     imgSrc = '<img src="' + data2.response.photos.items[0].prefix + '75x75' + data2.response.photos.items[0].suffix + '">';
                 }
                 else {
                     imgSrc = '<img src="/images/no_image_available.gif" width="75">';
                 }
                 $('.results').append('<div class="col-xs-4 col-sm-2 col-md-2" style="margin-top:10px;padding-left:5px">' + imgSrc + '</div>');
              }
            });
            
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
        });
      }
    });
}

$(document).ready(function() {
    var imgSrc = "";
    var contents = "";        
    $.ajax({
      url: 'https://api.foursquare.com/v2/venues/'+venueId+'/photos?&limit=1&oauth_token=ADKCZISL2BPWAUVWFY1EN4Z012FAPIYJQPYVLG1U4EXTCCZB&v=20140715',
      dataType: 'json',
      async: false,
      cache: false,
      success: function(data2) {
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