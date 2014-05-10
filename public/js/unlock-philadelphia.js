var mapboxId = 'jamestyack.hl98j78k';
var mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/' + mapboxId + '/{z}/{x}/{y}.png';
var mapboxAttribution = '<a target="_blank" href="https://www.mapbox.com/about/maps/">© Mapbox © OpenStreetMap</a> <a class="mapbox-improve-map" target="_blank" href="https://www.mapbox.com/map-feedback/#examples.map-9ijuk24y/8.538/47.365/15">Improve this map</a>';
var stationLayerGroups = {};
var businessLayerGroup = null;
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

var mapPosition = {};
mapPosition["Fairmount"] = {
	"coords" : [39.966959, -75.160391],
	"zoom" : 12
};

var map = L.mapbox.map('map', mapboxId)
	.addControl(L.mapbox.geocoderControl(mapboxId))
	.setView(mapPosition["Fairmount"]["coords"], mapPosition["Fairmount"]["zoom"])

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
						title: station.stop_name,
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
				var zoom = Math.max(16, map.getZoom());
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
	for (var i=0; i<data.businesses.length && i<MAX_YELP_RESULTS; i++) {
		alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		var business = data.businesses[i];
		feature = {
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [business.location.geocoding.lng, business.location.geocoding.lat]
				},
				properties: {
					title: alph.charAt(i) + ". <a target='_blank' href='" + business.url + "'>" + business.name + "</a>",
					description: "<a target='_blank' href='" + business.url + "'><img style='max-width:80px' align='right' src='" + business.image_url + "'/></a><strong>" + business.categories[0][0] + "</strong><br />" + business.location.address +
					      "<br/><span><img title='" + business.snippet_text + "' src='" + business.rating_img_url + "'/></a><img src='http://s3-media1.ak.yelpcdn.com/assets/2/www/img/14f29ad24935/map/miniMapLogo.png' alt='Yelp Logo, mini' height='20' width='40'><br/><a target='_blank' href='" + business.url + "'>" + business.review_count + " reviews</span><br/>Yelp says 'Wheelchair Accessible', leave an accessibility review if you visit.",
						'marker-size': 'small',
						'marker-color': "#0099cc",
						'marker-symbol': alph.toLowerCase().charAt(i)
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
	radiusInMetres = 1000;
	console.log('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres);
	$.getJSON('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres, function(data) {
		$('#yelp-heading').html("Accessible near " + name);
		$('#yelp-results').html(createListOfResults(data, name));
		addLayerAndShowYelpResults(data, name);
	});
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
		response += "<span class='red'>Elevator outage reported approx " + getOutageLength(station.outageTracker.duration) + " ago</span><br />" + station.elevatorOutage.elevator + "<br/>"
			+ station.elevatorOutage.message + "<br/>"
			+ "<a target= '_blank' href='http://www2.septa.org/elevators/'>Advice page</a> or Tweet @SEPTA_SOCIAL for help"  
			+ "</p>";
	}
	return response;
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
					"<strong>" + data.length + " elevator " + (data.length > 1 ? "outages are" : "outage is") + " restricting access.</strong> </p>" + getElevatorOutageStations(data));
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
		stringToReturn += "<li>" + outage.stop_name + " (" + getLineName(outage.line_code) + ")<br /><strong>reported approx " + getOutageLength(outage.duration) + " ago.</strong>";
	}
	if (data.length > 0){
		stringToReturn += "</ul>Visit <a target='_blank' href='http://www2.septa.org/elevators/'>Septa website</a> or Tweet @SEPTA_SOCIAL for help</small>";
	}
	return stringToReturn;
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
