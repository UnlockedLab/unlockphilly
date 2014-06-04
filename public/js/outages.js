/*jslint undef: true*//*global d3*/
// TODO: fix X axis to last month instead of min/max outage
// TODO: tweak sizing and get labels aligning correctly

function renderOutageChart(outages) {

    // settings
    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = 960 - margin.left - margin.right,
        
        dateEnd = new Date(),
        dateStart = (function() {
            var tempDate = new Date();
            tempDate.setMonth(tempDate.getMonth() - 1);
            return tempDate;
        })(),
        // uncomment to use min/max outage for date range
//        dateEnd = d3.max(outages, function(d) { return d.outageEnd || new Date(); }),
//        dateStart = d3.min(outages, function(d) { return d.outageStart; }),
//        blockNames = ['morning', 'workday', 'evening'];
//        blockNames = ["12p", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"];
//        blockNames = ["12p", "2a", "4a", "6a", "8a", "10a", "12a", "2p", "4p", "6p", "8p", "10p"];
        blockNames = ["12a", "4a", "8a", "12p", "4p", "8p"];
        
    var days = _buildDaysList(dateStart, dateEnd),
        blocksPerDay = blockNames.length,
        gridSize = Math.floor(width / days.length),
        height = gridSize * blocksPerDay,
        hourBlocks = _buildHourBlocks(days, blocksPerDay, outages);
        
//    console.log('outages', outages);
//    console.log('hourBlocks', hourBlocks);

    var svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var timeLabels = svg.selectAll(".timeLabel")
        .data(blockNames)
        .enter().append("text")
            .text(function(d) { return d; })
            .attr("x", -5)
            .attr("y", function(d, i) { return i * gridSize + gridSize / 2; })
            .style("text-anchor", "end")
            .style("alignment-baseline", "middle")
//            .attr("transform", "translate(-16," + gridSize / 1.5 + ")")
            .attr("class", function(d, i) {
                return 'timeLabel mono axis' + (i >= 2 && i <= 4 ? ' axis-worktime' : '');// + (i >= 7 && i <= 16 ? ' axis-worktime' : '');
            });

    var dayLabels = svg.selectAll(".dayLabel")
        .data(days)
        .enter().append("text")
            .text(function (d) { return d.getDate(); })
            .attr("x", function (d, i) { return i * gridSize + gridSize / 2; })
            .attr("y", -5)
            .style("text-anchor", "middle")
//            .attr("transform", "translate(" + gridSize / 2 + ", -6)")
            .attr("class", function (d, i) {
                var weekday = d.getDay();
                return 'dayLabel mono axis' + (weekday != 0 && weekday != 6 ? ' axis-workweek' : '');
            });
    
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            var count = d.outageIndex.length;
            if (count) {
                return '<p><strong>' + count + ' outage' + (count > 1 ? 's' : '') + '</strong> recorded, covering ' + Math.round(d.outage * 100) + '% of this block:</p><ul><li>' +
                    d.outageIndex.map(function(outageIndex) {
                        var outage = outages[outageIndex];
                        return outage.outageStart.toLocaleString() + '–' + (outage.outageEnd ? outage.outageEnd.toLocaleString() : '<u>ongoing</u>');
                    }).join('</li><li>') +
                    '</li></ul>';
            } else {
                return 'No outage was reported during this hour';
            }
        });

    svg.call(tip);

    var heatMap = svg.selectAll(".hour")
        .data(hourBlocks)
        .enter().append("rect")
            .attr("x", function(d) { return d.day * gridSize; })
            .attr("y", function(d) { return d.block * gridSize; })
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("class", "hour bordered")
            .attr("width", gridSize)
            .attr("height", gridSize)
            .style("fill", '#FF0000')
            .style("fill-opacity", 0)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

    heatMap.transition().duration(1000)
        .style("fill-opacity", function(d) { return d.outage; });

//    heatMap.append("title").text(function(d) {
//        var count = d.outageIndex.length;
//        if (count) {
//            return count + ' outage' + (count > 1 ? 's' : '') + ' recorded, covering ' + Math.round(d.outage * 100) + '% of this block:\n' +
//                d.outageIndex.map(function(outageIndex) {
//                    var outage = outages[outageIndex];
//                    return outage.outageStart.toLocaleString() + '–' + (outage.outageEnd ? outage.outageEnd.toLocaleString() : 'ongoing');
//                }).join('\n');
//        } else {
//            return 'No outage was reported during this hour';
//        }
//    });

    function _buildDaysList(min, max) {
        var date = new Date(min.getTime()),
            days = [];

        while (date <= max) {
            days.push(new Date(date.getTime()));
            date.setDate(date.getDate() + 1);
        }

        return days;
    }
    
    function _buildHourBlocks(days, blocksPerDay, outages) {
        var outageIndex = 0,
            outageStart = outages[outageIndex].outageStart,
            outageEnd = outages[outageIndex].outageEnd || new Date(),
            time = new Date(days[0].getTime()),
            blocks = [],
            blockMilliseconds = (1000 * 60 * 60 * 24) / blocksPerDay,
            blockOutageStart, blockOutageEnd, blockOutageFraction, blockOutages, carriedBlockFraction = 0;

        time.setHours(0);
        time.setMinutes(0);
        time.setSeconds(0);

        // generate hours blocks
        for (var dayIndex = 0; dayIndex < days.length; dayIndex++) {
            for (var dayBlockIndex = 0; dayBlockIndex < blocksPerDay; dayBlockIndex++) {
                blockOutages = [];
                if (outageIndex === null) {
                    blockOutageFraction = 0;
                } else {
                    blockOutageStart = outageStart - time;
                    blockOutageEnd = outageEnd - time;

                    if (blockOutageStart > blockMilliseconds) {
                        blockOutageFraction = 0;
                    } else if (blockOutageEnd >= blockMilliseconds) {
                        blockOutageFraction = Math.min(1, (blockMilliseconds - blockOutageStart) / blockMilliseconds);
                        blockOutages.push(outageIndex);
                    } else {
                        blockOutageFraction = Math.min(1, blockOutageEnd / blockMilliseconds);
                        blockOutages.push(outageIndex);

                        // advanced to next outage
                        if (++outageIndex < outages.length) {
                            outageStart = outages[outageIndex].outageStart;
                            outageEnd = outages[outageIndex].outageEnd || new Date();
                            
                            // if next block is within same hour, write fraction to carry and repeat this iteration
                            if (outageStart - time < blockMilliseconds) {
                                carriedBlockFraction = blockOutageFraction;
                                dayBlockIndex--;
                                continue;
                            }
                        } else {
                            outageIndex = null;
                        }
                    }
                }

                // apply carried fraction if any
                if (carriedBlockFraction) {
                    blockOutageFraction = Math.min(1, blockOutageFraction + carriedBlockFraction);
                    carriedBlockFraction = 0;
                    blockOutages.push(outageIndex === null ? outages.length - 2 : outageIndex - 1);
                }

//                console.log('dayIndex = %o, hourIndex = %o, time = %o, blockOutageFraction = %o', dayIndex, hourIndex, time, blockOutageFraction);

                blocks.push({
                    day: dayIndex,
                    block: dayBlockIndex,
                    outage: blockOutageFraction,
                    outageIndex: blockOutages
                });

                time.setMilliseconds(time.getMilliseconds() + blockMilliseconds);
            }
        }

        return blocks;
    }
}