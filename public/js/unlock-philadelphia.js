var mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/' + mapboxId + '/{z}/{x}/{y}.png';
var mapboxAttribution = '<a target="_blank" href="https://www.mapbox.com/about/maps/">© Mapbox © OpenStreetMap</a> <a class="mapbox-improve-map" target="_blank" href="https://www.mapbox.com/map-feedback/#examples.map-9ijuk24y/8.538/47.365/15">Improve this map</a>';
var stationLayerGroups = {};
var businessLayerGroup = null;
var aroundThisLocationLayer = null;
var isFirstView = false;
var accessTypeWheelchair = 'Wheelchair';
var accessTypeOutage = 'Outage';
var accessTypeStairsOnly = 'StairsOnly';
var accessTypeBusiness = 'AccessTypeBusiness';
var accessTypes = [accessTypeWheelchair, accessTypeOutage, accessTypeStairsOnly, accessTypeBusiness];
var accessTypesLabels = ['Accessible station', 'Station with elevator outage', 'Station with restricted/limited access', 'Business listed as accessible on Yelp'];
var accessTypeColors = {};
var info;
var infoVisible=true;
accessTypeColors[accessTypeWheelchair] = "#1a9641";
accessTypeColors[accessTypeStairsOnly] = "#bababa";
accessTypeColors[accessTypeOutage] = "#d7191c";
accessTypeColors[accessTypeBusiness] = "#0099cc";
var twitterCode = "<a href='https://twitter.com/intent/tweet?screen_name=septa' class='twitter-mention-button' data-related='septa'>Tweet to @septa</a><script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>";
var MAX_YELP_RESULTS = 26;
var geocoderControl = L.mapbox.geocoderControl(mapboxId);

var mapPosition = {};
mapPosition["Fairmount"] = {
	"coords" : [39.966959, -75.160391],
	"zoom" : 13
};

var map = L.mapbox.map('map', mapboxId)
	.addControl(geocoderControl)
	.setView(mapPosition["Fairmount"]["coords"], mapPosition["Fairmount"]["zoom"]);

map.on('locationfound', function(e) {
    map.fitBounds(e.bounds);
	map.setZoom(15);
	if (aroundThisLocationLayer!=null) {
		map.removeLayer(aroundThisLocationLayer);
	}
	aroundThisLocationLayer = null;
	aroundThisLocationLayer = L.mapbox.featureLayer({
	    	type: 'Feature',
	    	geometry: {
	        type: 'Point',
	        coordinates: [
	          e.latlng.lng,
	          e.latlng.lat 
	        ]
	    },
	    properties: {
	        title: 'You are here!',
	        description: 'Tip: you can also tap on stations to find accessible venues around them',
	        'marker-size': 'medium',
	        'marker-color': '#bcbddc',
	        'marker-symbol': 'heart'
	    }
	})
	aroundThisLocationLayer.addTo(map);
	aroundThisLocationLayer.on('mouseover', function(e) {
    	e.layer.openPopup();
	});
	aroundThisLocationLayer.on('mouseout', function(e) {
    	e.layer.closePopup();
	});
    updateYelpResults(e.latlng.lat, e.latlng.lng, "me");
});

geocoderControl.on('select', function(e) {
	console.log(e);
	updateYelpResults(e.data[0].lat, e.data[0].lon, e.data[0].name);
});

geocoderControl.on('autoselect', function(e) {
	console.log(e);
	updateYelpResults(e.data.latlng[0], e.data.latlng[1], e.data.results[0][0].name);
});

$(document).ready(function() {
	// ensures checkboxes reset in firefox
	$(":checkbox").attr("autocomplete", "off");
	
	$('input[id*=line]').change(function() {
		clearStationLayers();
		populateStationLayerGroupsAndRefreshView(this.value);
	});

	$('input[id*=filter]').change(function() {
		isFirstView = false;
		if (this.checked) {
			map.addLayer(stationLayerGroups[this.value]);
		} else {
			map.removeLayer(stationLayerGroups[this.value]);
		}
	});

	addLegend();
	addInfoBox();
	addScaleBox();
	populateStationLayerGroupsAndRefreshView("ALL");
	var myLocationLayer = L.mapbox.featureLayer().addTo(map);
	addLocateMeButton();
});



function clearStationLayers() {
	isFirstView = false;
	map.removeLayer(stationLayerGroups[accessTypeWheelchair]);
	map.removeLayer(stationLayerGroups[accessTypeStairsOnly]);
}

function populateStationLayerGroupsAndRefreshView(line) {
	info.update();
	$.getJSON('/septa/stations/line/' + line, function(data) {
		addLayersAndShow(data, line);
	});
}

function addLayersAndShow(stationData, line) {
	stations = {};
	stations[accessTypeWheelchair] = [];
	stations[accessTypeStairsOnly] = [];
		for ( i = 0; i < stationData.stations.length; i++) {
			(function() {
				// go through each station
				var station = stationData.stations[i];
				
				feature = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [station.stop_lon, station.stop_lat]
					},
					properties: {
						title: "<a href='" + window.location.href + "station/" + station._id + "'>" + station.stop_name + "</a>",
						description: formatStation(station),
						'marker-size': 'small',
						'marker-color': getAccessTypeColor(station),
						'marker-symbol': 'rail-metro'
					}
				};
				stations[getAccessType(station)].push(feature);
			})();
		}
		info.update(getLineName(line));
		legend.update('severity');
		
		for ( i = 0; i < accessTypes.length; i++) {
			stationLayerGroups[accessTypes[i]] = L.mapbox.featureLayer(stations[accessTypes[i]]);
			stationLayerGroups[accessTypes[i]].on('click', function(e) {
				lng = e.layer.feature.geometry.coordinates[1];
				lat = e.layer.feature.geometry.coordinates[0];
				name = e.layer.feature.properties.title;	
				updateYelpResults(lng, lat, name);
				if (infoVisible) {
					info.removeFrom(map);
					infoVisible=false;
				}
				var zoom = Math.max(15, map.getZoom());
				map.setView(new L.LatLng(lng, lat), zoom, {
						animate: true,
						});
			});
			map.addLayer(stationLayerGroups[accessTypes[i]]);
		}
}

function addLayerAndShowYelpResults(data, name) {
	
	console.log(businessLayerGroup);
	var businesses = [];
	for (var i = 0; i < data.businesses.length && i < MAX_YELP_RESULTS; i++) {
		alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		var business = data.businesses[i];
		feature = {
			type : 'Feature',
			geometry : {
				type : 'Point',
				coordinates : [business.location.geocoding.lng, business.location.geocoding.lat]
			},
			properties : {
				title : alph.charAt(i) + ". <a target='_blank' href='" + business.url + "'>" + business.name + "</a>",
				description : "<a target='_blank' href='" + business.url + "'><img style='max-width:80px' align='right' src='" + business.image_url + "'/></a><strong>" + business.categories[0][0] + "</strong><br />" + business.location.address + "<br/>" + business.display_phone + "<br/><span><img title='" + business.snippet_text + "' src='" + business.rating_img_url + "'/></a><img src='http://s3-media1.ak.yelpcdn.com/assets/2/www/img/14f29ad24935/map/miniMapLogo.png' alt='Yelp Logo, mini' height='20' width='40'><br/><a target='_blank' href='" + business.url + "'>" + business.review_count + " reviews</span><br/>Yelp says 'Wheelchair Accessible', leave an accessibility review if you visit.",
				'marker-size' : 'small',
				'marker-color' : "#0099cc",
				'marker-symbol' : alph.toLowerCase().charAt(i)
			}
		};
		businesses.push(feature);
	}
	businessLayerGroup = L.mapbox.featureLayer(businesses);
	map.addLayer(businessLayerGroup); 

}

function updateYelpResults(lat, lng, name) {
	if (businessLayerGroup != null) {
		map.removeLayer(businessLayerGroup);
	}
	inProgressYelp(name);
	radiusInMetres = 1000;
	console.log('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres);
	$.getJSON('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres, function(data) {
		$('#yelp-heading').html("Accessible near " + name);
		$('#yelp-results').html(createListOfResults(data, name));
		addLayerAndShowYelpResults(data, name);
	});
}

function inProgressYelp(name) {
	$('#yelp-heading').html("<h5>Searching for <br/>accessible venues around<br/>" + name + "</h5><img src='/images/ajax-loader.gif'></div>");
	$('#yelp-results').html("");
}

function createListOfResults(data, name) {
	var resultsHtml = "<small><ul class='list-group'>";
	for (var i=0; i<data.businesses.length && i<MAX_YELP_RESULTS; i++) {
		markerRef = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(i)
		var business = data.businesses[i];
		resultsHtml += "<li class='list-group-item'><strong>";
		resultsHtml += markerRef + ".</strong> <a target='_blank' href='" + business.url + "'>" + business.name + "</a> <strong>" + business.categories[0][0] +"</strong> (" +
			 Math.round(business.distance) + " metres from " + name + ")<br />" + business.location.display_address[0] + " " + business.display_phone +
			 " <br /><img title='" + business.snippet_text + "' src='" + business.rating_img_url + "'/></a> (" + business.review_count + " reviews) ";
		resultsHtml += "<br />Yelp listing says 'Wheelchair Accessible'</li>";
		$('#popoverData').popover();
	}
	if (data.businesses.length == 0) {
		resultsHtml += "<li class='list-group-item'>No accessible businesses found close to " + name + "<a/>";
	}
	
	return resultsHtml + "</ul></small>";
	
}

function getLineName(line) {
	if (line == "MFL") {
		return "Market-Frankford Line";
	} else if (line == "BSS") {
		return "Broad Street Subway";
	} else if (line == "PATCO") {
		return "PATCO Speedline";
	} else if (line == "ALL") {
		return "Subway and High Speed Line Stations";
	} else {
		console.error(line + " unknown");
		return "";
	}
	
}

function getAccessTypeColor(station) {
	if (station.elevatorOutage) {
		return accessTypeColors[accessTypeOutage];
	}
	if (station.wheelchair_boarding == "1") {
		return accessTypeColors[accessTypeWheelchair];
	} else {
		return accessTypeColors[accessTypeStairsOnly];
	}
}

function getAccessType(station) {
	if (station.wheelchair_boarding == "1") {
		return accessTypeWheelchair;
	} else {
		return accessTypeStairsOnly;
	}
}

function getOutageLength(mins) {
	if (mins < 60) {
		return mins + " minutes";
	} else if (mins >= 60 && mins < 1440) {
		hours = Math.floor(mins / 60);          
    	minutes = mins % 60;
		return hours + " " + (hours == 1 ? "hr, " : "hrs, ") + minutes + (minutes == 1 ? " min" : " mins");
	} else {
		days = Math.floor(mins / 60 / 24);
		hours = mins % (24);
		return days + " " + (days == 1 ? "day, " : "days, ") + hours + (hours == 1 ? " hr" : " hrs");
	}
	
}

function formatStation(station) {
	var response = "";
	if (station.elevatorOutage) {
		response += "<span class='red'>Elevator outage<br/>Reported approx " + getOutageLength(station.outageTracker.duration) + " ago</span><br />" + station.elevatorOutage.elevator + "<br/>"
			+ station.elevatorOutage.message
			+ "</p>";
	} else {
		response += (station.wheelchair_boarding == "1" ? "" : "Not ") + "Wheelchair Accessible";
	}
	return response + " <a href='" + window.location.href + "station/" + station._id + "'>more ...</a>";
}

function getLine(station) {
	var response = "";
	if (station.MFL == 1) {
		response += "Market Frankford Line";
	}
	if (station.BSS == 1) {
		response += (response=="" ? "" : "/") + "Broad Street Subway";
	}
	if (station.NHSL == 1) {
		response += (response=="" ? "" : "/") + "Norristown High Speed Line";
	}
	if (station.PATCO == 1) {
		response += (response=="" ? "" : "/") + "PATCO Speedline";
	}
	return response + "";
}

/*
 * Based on http://leafletjs.com/examples/choropleth.html leaflet tutorial
 */
function addInfoBox() {
	info = L.control();
	info.onAdd = function(map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};
	info.update = function(title) {
		this._div.innerHTML = '<h4>' + ( title ? title : 'Loading data') + '</h4><div id="stationOutageMessage"></div>';
		$.getJSON("/septa/elevator/outages", function(data) {
			if ("errorMessage" in data) {
				$('#stationOutageMessage').html(data.errorMessage + "<br /></ul>Visit <a target='_blank' href='http://www3.septa.org/hackathon/elevator/'>Septa website</a> or Tweet @SEPTA_SOCIAL for help.</small>");
			} else if (data.length==0) {
				$('#stationOutageMessage').html("No reported elevator outages");
			} else {
				$('#stationOutageMessage').html("<p class='text-danger'>" +
					"<strong>" + data.length + (data.length > 1 ? " stations are" : " station is") + " affected by elevator outages.</strong> </p>" + getElevatorOutageStations(data));
			}
		});
	
		
	};
	info.addTo(map);
	map.on('click', function(e){
		//info.removeFrom(map);	
	});
}

/*
 * Adding scale box on map
 */
function addScaleBox(){
	scale = L.control.scale().addTo(map);
}

function getElevatorOutageStations(data) {
	var stringToReturn = "<small><ul>";
	for (var i=0; i < data.length; i++) {
		outage = data[i];
		stringToReturn += "<li><a href='/station/" + outage._id.stationId + "'>" + outage.stop_name + " (" + getLineName(outage.line_code) + ")</a>";
	}
	return stringToReturn;
}

function addLocateMeButton() {
	var myButtonOptions = {
      'text': '',  // string
      'iconUrl': 'images/access_near_me.png',  // string
      'onClick': my_button_onClick,  // callback function
      'hideText': true,  // bool
      'maxWidth': 30,  // number
      'doToggle': false,  // bool
      'toggleStatus': false  // bool
	}   

	var myButton = new L.Control.Button(myButtonOptions).addTo(map);
}

function my_button_onClick() {
    console.log("someone clicked my button");
    inProgressYelp("...");
    map.locate();
}

function addLegend() {
	legend = L.control({
		position : 'bottomright'
	});
	legend.onAdd = function(map) {
		legendDiv = L.DomUtil.create('div', 'info legend');
		for (var i = 0; i < accessTypes.length; i++) {
			legendDiv.innerHTML += '<i style="background:' + accessTypeColors[accessTypes[i]] + '"></i> ' + accessTypesLabels[i] + '<br>';
		}
		return legendDiv;
	};
	legend.update = function(type) {
		// update stuff
	};
	legend.addTo(map);
}

L.Control.Button = L.Control.extend({
  options: {
    position: 'topright'
  },
  initialize: function (options) {
    this._button = {};
    this.setButton(options);
  },
 
  onAdd: function (map) {
    this._map = map;
    var container = L.DomUtil.create('div', 'leaflet-control-button');
	
    this._container = container;
    
    this._update();
    return this._container;
  },
 
  onRemove: function (map) {
  },
 
  setButton: function (options) {
    var button = {
      'text': options.text,                 //string
      'iconUrl': options.iconUrl,           //string
      'onClick': options.onClick,           //callback function
      'hideText': !!options.hideText,         //forced bool
      'maxWidth': options.maxWidth || 70,     //number
      'doToggle': options.toggle,			//bool
      'toggleStatus': false					//bool
    };
 
    this._button = button;
    this._update();
  },
  
  getText: function () {
  	return this._button.text;
  },
  
  getIconUrl: function () {
  	return this._button.iconUrl;
  },
  
  destroy: function () {
  	this._button = {};
  	this._update();
  },
  
  toggle: function (e) {
  	if(typeof e === 'boolean'){
  		this._button.toggleStatus = e;
  	}
  	else{
  		this._button.toggleStatus = !this._button.toggleStatus;
  	}
  	this._update();
  },
  
  _update: function () {
    if (!this._map) {
      return;
    }
 
    this._container.innerHTML = '';
    this._makeButton(this._button);
 
  },
 
  _makeButton: function (button) {
    var newButton = L.DomUtil.create('div', 'leaflet-buttons-control-button', this._container);
    if(button.toggleStatus)
    	L.DomUtil.addClass(newButton,'leaflet-buttons-control-toggleon');
        
    var image = L.DomUtil.create('img', 'leaflet-buttons-control-img', newButton);
    image.setAttribute('src',button.iconUrl);
    
    if(button.text !== ''){
 
      L.DomUtil.create('br','',newButton);  //there must be a better way
 
      var span = L.DomUtil.create('span', 'leaflet-buttons-control-text', newButton);
      var text = document.createTextNode(button.text);  //is there an L.DomUtil for this?
      span.appendChild(text);
      if(button.hideText)
        L.DomUtil.addClass(span,'leaflet-buttons-control-text-hide');
    }
 
    L.DomEvent
      .addListener(newButton, 'click', L.DomEvent.stop)
      .addListener(newButton, 'click', button.onClick,this)
      .addListener(newButton, 'click', this._clicked,this);
    L.DomEvent.disableClickPropagation(newButton);
    return newButton;
 
  },
  
  _clicked: function () {  //'this' refers to button
  	if(this._button.doToggle){
  		if(this._button.toggleStatus) {	//currently true, remove class
  			L.DomUtil.removeClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
  		}
  		else{
  			L.DomUtil.addClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
  		}
  		this.toggle();
  	}
  	return;
  }
 
});
