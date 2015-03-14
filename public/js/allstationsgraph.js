		
		function abbrev(station) {
			abbrevSt = station.replace("Station", "");
			abbrevSt = abbrevSt.replace("Transportation", "Trans");
			abbrevSt = abbrevSt.replace("Center", "Ctr");
			return abbrevSt;
			
		}
		
        function renderAllStationYearlyTotalsGraph(outages) {
        	var margin = {top: 10, right: 20, bottom: 30, left: 40},
             width = 1200 - margin.left - margin.right,
             height = 400 - margin.top - margin.bottom;
        	var barPadding = 3;
        	var maxDays = 0;
        	outages.forEach(function (d) {
        		if (d.totalDaysOutageReported > maxDays) {
        			maxDays = d.totalDaysOutageReported;
        		}
        	});
	        var svg = d3.select("#yearlygraph").append("svg")
	            .attr("width", width + margin.left + margin.right)
	            .attr("height", height + margin.top + margin.bottom)
	            .append("g")
	            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	        
	        var tip = d3.tip()
		        .attr('class', 'd3-tip')
		        .offset([-10, 0])
		        .html(function(d) {
		            return d._id.stop_name + " (" + d._id.line_code + ")" + "<br/>" + d.totalDaysOutageReported + " day(s)<br/>where outage<br/>reported";
		        });
		    svg.call(tip);
	        //var x = d3.scale.linear()
	        //  .domain([0, outages.length-1])
	        //  .range([0, width]);
	        var columns = outages.map(function (d, i) {
	        		if (i < outages.length-1) {	
    					return i	;
    				} else {
    					return d;
    				}
    			});
    		columns.pop();
	        var x = d3.scale.ordinal()
    			.rangeRoundBands([0, width], .1)
    			.domain(columns);
	        var xAxis = d3.svg.axis()
	            .scale(x)
	            .orient("bottom")
	            .tickSize(0, 0)
	            .tickFormat(function(d, i) {
	              if (i < outages.length-1) {
	                return abbrev(outages[d]._id.stop_name) + " (" + outages[d]._id.line_code + ")";
	              } else {
	              	return"";
	             }});
	        var g = svg.append("g")
	             .attr("class", "x axis")
	             .attr("transform", "translate(0," + height + ")")
	             .call(xAxis)
	             .selectAll("text")
    			 .attr("y", 0)
    			 .attr("x", 9)
			     .attr("dy", ".35em")
			     .attr("transform", "rotate(270)")
			     .style("text-anchor", "start");
	        var yScale = d3.scale.linear()
	            .domain([Math.max(maxDays, 31),0])
	            .range([0, height]);
	        var yAxis = d3.svg.axis()
	         	.scale(yScale)
	         	.orient("left")
	         	.tickSize(5,0);
	        var gY = svg.append("g")
	            .attr("class", "y axis")
	            .attr("transform", "translate(" + 0 + ",0)")
	            .call(yAxis);
	        svg.selectAll("a")
	            .data(outages)
	            .enter()
	            .append("a")
	            .attr("xlink:href", function(d, i) { 
	            	if (i < outages.length-1) {
	            		return "/station/" + d._id.stationId;
	            	} else {
	            		return "";
	            	}
	            })
	            .append("rect")
	            .attr("x", function (d, i) {
	               if (i < outages.length-1) {
	               	return x(i);
	               }
	            })
	            .attr("y", function (d, i) {
	            	if (i < outages.length-1) {
	                	return yScale(d.totalDaysOutageReported);
	               }
	            })
	            .attr("width", width / outages.length - 4)
	            .attr("height", function (d, i) {
	            	if (i < outages.length-1) {
	                	return height - yScale(d.totalDaysOutageReported);
	                }
	            })
	            //.attr("stroke", "rgb(255,0,0)")
	            .attr("fill", function(d, i) {
	                if (i < outages.length-1) {
	                  return "rgba(255, 0, 0, 0.4)";
	                } else {
	                  return "rgb(255,255,255)";
	                }
	            })
	            .on("mouseover", tip.show)
	            .on("mouseout", tip.hide);
	          svg.append("text")
		        .attr("y", height + 6)
		        .attr("x",width / 2)
		        .attr("dy", "1em")
		        .style("text-anchor", "middle")
		        .text("Station");
	          svg.append("text")
		        .attr("transform", "rotate(-90)")
		        .attr("y", -40)
		        .attr("x",0 - (height / 2))
		        .attr("dy", "1em")
		        .style("text-anchor", "middle")
		        .text("Days affected by outage *");
	        }