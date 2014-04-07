var mapboxId = 'jamestyack.hl98j78k';
var mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/' + mapboxId + '/{z}/{x}/{y}.png';
var mapboxAttribution = '<a target="_blank" href="https://www.mapbox.com/about/maps/">© Mapbox © OpenStreetMap</a> <a class="mapbox-improve-map" target="_blank" href="https://www.mapbox.com/map-feedback/#examples.map-9ijuk24y/8.538/47.365/15">Improve this map</a>';
var stationLayerGroups = {};
var isFirstView = false;
var accessTypeWheelchair = 'Wheelchair';
var accessTypeOutage = 'Outage';
var accessTypeStairsOnly = 'StairsOnly';
var accessTypes = [accessTypeWheelchair, accessTypeOutage, accessTypeStairsOnly];
var accessTypesLabels = ['Accessible with elevator and Ramp', 'Elevator outage restricting access', 'Stairs only'];
var accessTypeColors = {};
var info;
var infoVisible=true;
accessTypeColors[accessTypeWheelchair] = "#1a9641";
accessTypeColors[accessTypeStairsOnly] = "#bababa";
accessTypeColors[accessTypeOutage] = "#d7191c";
var twitterCode = "<a href='https://twitter.com/intent/tweet?screen_name=septa' class='twitter-mention-button' data-related='septa'>Tweet to @septa</a><script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>";


var mapPosition = {};
mapPosition["Fairmount"] = {
	"coords" : [39.966959, -75.160391],
	"zoom" : 13
};

//var mapboxLayer = L.tileLayer(mapboxUrl);

// var map = L.map('map', {
	// center : mapPosition["Fairmount"].coords,
	// zoom : mapPosition["Fairmount"].zoom,
	// layers : [mapboxLayer]
// });

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
						'marker-symbol': (station.wheelchair_boarding == "1" && !station.elevatorOutage  ? 'disability': 'roadblock')
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
				var zoom = Math.max(mapPosition["Fairmount"].zoom, map.getZoom());
				map.setView(new L.LatLng(lng, lat), zoom, {
						animate: true,
						});
			});
			map.addLayer(stationLayerGroups[accessTypes[i]]);
		}
}

function updateYelpResults(lat, lng, name) {
	radiusInMetres = 1000;
	console.log('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres);
	$.getJSON('/yelp/wheelchairaccess/' + lat + "/" + lng + "/" + radiusInMetres, function(data) {
		$('#yelp-heading').html("Accessible near " + name);
		$('#yelp-results').html(createListOfResults(data, name));
	});
}

function createListOfResults(data, name) {
	var resultsHtml = "<small><ul class='list-group'>";
	for (var i=0; i<data.businesses.length && i<30; i++) {
		var business = data.businesses[i];
		resultsHtml += "<li class='list-group-item'>";
		resultsHtml += "<a target='_blank' href='" + business.url + "'>" + business.name + "</a> <strong>" + business.categories[0][0] +"</strong> (" +
			 Math.round(business.distance) + " metres from " + name + ")<br />" + business.location.display_address[0] + " " + business.display_phone +
			 " <br /><img title='" + business.snippet_text + "' src='" + business.rating_img_url + "'/></a> (" + business.review_count + " votes) ";
		resultsHtml += "</li>";
		$('#popoverData').popover();
	}
	
	return resultsHtml + "</ul></small>";
	
}

function getLineName(line) {
	if (line == "MFL") {
		return "Market-Frankford Line";
	} else if (line == "BSS") {
		return "Broad Street Line";
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

function formatStation(station) {
	var response = "<em>" + getLine(station) + "</em><br />";
	if (station.elevatorOutage) {
		response += "ELEVATOR OUTAGE<br/>" 
			+ station.elevatorOutage.message + "<br/>"
			+ "Line: " + station.elevatorOutage.line + "<br/>"
			+ "Elevator: " + station.elevatorOutage.elevator + "<br/>"
			+ station.elevatorOutage.message + "<br/>"
			+ "See : <a target= '_blank' href='" + station.elevatorOutage.alternate_url + "'>" + "SEPTA advice" + "</a>"  
			+ "</p>";
	} else {
		response += "Station is " + (station.wheelchair_boarding == "1" ? "" : " not") + " wheelchair accessible<br />";
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
			if (data.meta.elevators_out==0) {
				$('#stationOutageMessage').html("No reported elevator outages");
			} else {
				var outages = data.meta.elevators_out;
				$('#stationOutageMessage').html("<p class='text-danger'>" +
					"<strong>" + outages + " elevator " + (outages > 1 ? "outages have" : "outage has") + " been reported.</strong> </p>" + getElevatorOutageStations(data));
			}
		});
	
		
	};
	info.addTo(map);
	map.on('click', function(e){
		info.removeFrom(map);	
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
	for (var i=0; i < data.results.length; i++) {
		outage = data.results[i];
		stringToReturn += "<li>" + outage.station;
	}
	if (data.results.length > 0){
		stringToReturn += "</ul>Visit <a target='_blank' href='http://www2.septa.org/elevators/'>Septa website</a> for further info.</small>";
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
