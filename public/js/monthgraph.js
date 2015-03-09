		var margin = {top: 10, right: 20, bottom: 20, left: 20},
            width = 800 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;
        var barPadding = 1;
        function renderMonthGraph(outages) {
	        var svg = d3.select("#monthgraph").append("svg")
	            .attr("width", width + margin.left + margin.right)
	            .attr("height", height + margin.top + margin.bottom)
	            //.call(tip)
	            .append("g")
	            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	        var monthFormat = d3.time.format("%Y-%m");
	        
	        var tip = d3.tip()
		        .attr('class', 'd3-tip')
		        .offset([-10, 0])
		        .html(function(d) {
		            return d3.time.format("%b %Y")(monthFormat.parse(d.month)) + "<br/>" + d.days + " day(s)<br/>where outage<br/>reported";
		        });
		
		    svg.call(tip);
	        
	        var x = d3.scale.linear()
	          .domain([0, outages.length-1])
	          .range([0, width]);
	        var xAxis = d3.svg.axis()
	            .scale(x)
	            .orient("bottom")
	            .tickSize(10, 0)
	            .tickFormat(function(d) {
	              if (d<outages.length-1) {
	                return d3.time.format("%b %Y")(monthFormat.parse(outages[d].month));
	              }
	            });
	        
	        var g = svg.append("g")
	            .attr("class", "x axis")
	            .attr("transform", "translate(0," + height + ")")
	            .call(xAxis);
	        g.selectAll(".tick text")
	          .style("text-anchor", "start")
	          .attr("x", 9)
	          .attr("y", 4);
	        var yScale = d3.scale.linear()
	            .domain([31,0])
	            .range([0, height]);
	        var yAxis = d3.svg.axis()
	         	.scale(yScale)
	         	.orient("left")
	         	.tickSize(5,0);
	        var gY = svg.append("g")
	            .attr("class", "y axis")
	            .attr("transform", "translate(" + 0 + ",0)")
	            .call(yAxis);
	        svg.selectAll("rect")
	            .data(outages)
	            .enter()
	            .append("rect")
	            .attr("x", function (d, i) {
	               return x(i)+3;
	            })
	            .attr("y", function (d) {
	                return yScale(d.days);
	            })
	            .attr("width", width / outages.length)
	            .attr("height", function (d) {
	                return height - yScale(d.days);
	            })
	            .attr("fill", function(d, i) {
	                if (i < outages.length-1) {
	                  return "rgb(" + (d.days * 15 + 50) + ", 0, 0 )";
	                } else {
	                  return "rgb(255,255,255)";
	                }
	            })
	            .on("mouseover", tip.show)
	            .on("mouseout", tip.hide);
	          
	        }