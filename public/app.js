// set variables for pie_chart
const pie_margin = 100;
const pie_width = 600 - pie_margin;
const pie_height = 600 - pie_margin;

const radius = Math.min(pie_width, pie_height) / 2 - pie_margin;

// append the container for the graph to the page

// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var asset_pie = d3.select("#asset-pie")
    .append('svg')
    .attr("width", pie_width)
    .attr("height", pie_height)
    .append('g')
    .attr("transform", `translate(${pie_width / 2}, ${pie_height / 2})`);

var pie = d3.pie()
    .sort(null)
    .value(function (d) { return d[1]; })

var pie_arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius * 0.8)

var pie_outerArc = d3.arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9)

const color = d3.scaleOrdinal()
    .domain(["cash", "crypto", "investments"])
    .range(d3.schemeDark2);

// end variables for pie chart

// set variables for net-worth chart
// add SVG to the page
const nw_margin = { top: 50, right: 50, bottom: 50, left: 50 };
const nw_width = window.innerWidth - nw_margin.left - nw_margin.right;
const nw_height = 600 - nw_margin.top - nw_margin.bottom;
const networthBar = d3
    .select("#networth-bar")
    .append('svg')
    .attr('width', nw_width + nw_margin.left + nw_margin.right)
    .attr('height', nw_height + nw_margin.top + nw_margin.bottom)
    .call(responsivefy)
    .append('g')
    .attr('transform', `translate(${nw_margin.left},  ${nw_margin.top})`);

async function fetchNetWorth() {
    fetch('http://localhost:8080/networth')
        .then(response => response.json())
        .then(networth => {
            // for some reason date conversion doesn't work on server side, so do it on client side
            for (let i = 0; i < networth.length; i++) {
                networth[i].date = new Date(networth[i].date);
            }
            const sortedNetWorth = networth.sort(function (a, b) { return a.date - b.date });
            console.log("sorted: " + JSON.stringify(sortedNetWorth));
            updateChart(sortedNetWorth);
        });
}
// add SVG to the page

// Get the poll data from the `/poll` endpoint
async function fetchAssets() {
    fetch('http://localhost:8080/assets')
        .then(response => response.json())
        .then(assets => {
            console.log(JSON.stringify(assets));
            const data_ready = pie(Object.entries(assets));
            updatePie(data_ready, pie_arc, pie_outerArc);
            console.log("updated pie");
        });
}

function updatePie(data_ready, pie_arc, pie_outerArc) {
    // remove all old properties
    asset_pie.selectAll("g > *").remove();
    // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
    asset_pie
        .selectAll('allSlices')
        .data(data_ready)
        .join('path')
        .attr('d', pie_arc)
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)

    // Add the polylines between chart and labels:
    asset_pie
        .selectAll('allPolylines')
        .data(data_ready)
        .join('polyline')
        .attr("stroke", "black")
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function (d) {
            const posA = pie_arc.centroid(d) // line insertion in the slice
            const posB = pie_outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
            const posC = pie_outerArc.centroid(d); // Label position = almost the same as posB
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        })

    // Add the polylines between chart and labels:
    asset_pie
        .selectAll('allLabels')
        .data(data_ready)
        .join('text')
        .text(d => d.data[0] + " $" + d.data[1])
        .attr('transform', function (d) {
            const pos = pie_outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style('text-anchor', function (d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        })
}

function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode),
        nw_width = parseInt(svg.style("width")),
        nw_height = parseInt(svg.style("height")),
        aspect = nw_width / nw_height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + nw_width + " " + nw_height)
        .attr("perserveAspectRatio", "xMinYMid")
        .call(resize);

    // to register multiple listeners for same event type, 
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
        var targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
}

// set the dimensions and nw_margins of the graph
const updateDateRange = function (svg, firstDate) {
    // first null out attribute to remove it

    xMin = firstDate;
    xMax = new Date();

    const xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([0, nw_width])

    svg
        .selectAll("g")
        .data(data)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(xScale));
}


const updateChart = data => {
    console.log("updating chart, data: " + JSON.stringify(data));
    // remove all old properties
    networthBar.selectAll("g > *").remove();

    // find data range
    const xMin = d3.min(data, d => {
        return d['date'];
    });
    const xMax = d3.max(data, d => {
        return d['date'];
    });
    const yMin = d3.min(data, d => {
        return 0;
    });
    const yMax = d3.max(data, d => {
        return d['value'];
    });
    // scales for the charts
    const xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([0, nw_width]);
    const yScale = d3
        .scaleLinear()
        .domain([0, yMax])
        .range([nw_height, 0]);

    // create the axes component
    networthBar
        .append('g')
        .attr('id', 'xAxis')
        .attr('transform', `translate(0, ${nw_height})`)
        .call(d3.axisBottom(xScale));
    networthBar
        .append('g')
        .attr('id', 'yAxis')
        .attr('transform', `translate(${nw_width}, 0)`)
        .call(d3.axisRight(yScale));

    // generates close price line chart when called
    const line = d3
        .line()
        .x(d => {
            return xScale(d['date']);
        })
        .y(d => {
            return yScale(d['value']);
        });
    // Append the path and bind data
    networthBar
        .append('path')
        .data([data])
        .style('fill', 'none')
        .attr('id', 'priceChart')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', '1.5')
        .attr('d', line);

    const movingAverageData = movingAverage(data, data.length);
    // generates moving average curve when called
    const movingAverageLine = d3
        .line()
        .x(d => {
            return xScale(d['date']);
        })
        .y(d => {
            return yScale(d['value']);
        })
        .curve(d3.curveBasis);
    networthBar
        .append('path')
        .data([movingAverageData])
        .style('fill', 'none')
        .attr('id', 'movingAverageLine')
        .attr('stroke', '#FF8900')
        .attr('d', movingAverageLine);

    /* Volume series bars */
    let volData = []
    for (let i = data.length - 1; i > 0; i--) {
        volData.unshift({ date: data[i]['date'], value: data[i]['value'] - data[i - 1]['value'] });
    }

    const yMinValue = d3.min(volData, d => {
        return Math.min(Math.abs(d['value']));
    });
    const yMaxValue = d3.max(volData, d => {
        return Math.max(Math.abs(d['value']));
    });
    const yVolumeScale = d3
        .scaleLinear()
        .domain([yMinValue, yMaxValue])
        .range([0, nw_height / 2]);

    networthBar
        .selectAll()
        .data(volData)
        .enter()
        .append('rect')
        .attr('x', d => {
            return xScale(d['date']);
        })
        .attr('y', d => {
            return nw_height - yVolumeScale(Math.abs(d['value']));
        })
        .attr('fill', (d, i) => {
            if (i === 0) {
                return '#03a678';
            } else {
                return d['value'] < 0 ? '#c0392b' : '#03a678';
            }
        })
        .attr('width', 1)
        .attr('height', d => {
            return yVolumeScale(Math.abs(d['value']));
        });

    // renders x and y crosshair
    const focus = networthBar
        .append('g')
        .attr('class', 'focus')
        .style('display', 'none');
    focus.append('circle').attr('r', 4.5);
    focus.append('line').classed('x', true);
    focus.append('line').classed('y', true);
    networthBar
        .append('rect')
        .attr('class', 'overlay')
        .attr('width', nw_width)
        .attr('height', nw_height)
        .on('mouseover', () => focus.style('display', null))
        .on('mouseout', () => focus.style('display', 'none'))
        .on('mousemove', generateCrosshair);
    d3.select('.overlay').style('fill', 'none');
    d3.select('.overlay').style('pointer-events', 'all');
    d3.selectAll('.focus line').style('fill', 'none');
    d3.selectAll('.focus line').style('stroke', '#67809f');
    d3.selectAll('.focus line').style('stroke-width', '1.5px');
    d3.selectAll('.focus line').style('stroke-dasharray', '3 3');

    //returs insertion point
    const bisectDate = d3.bisector(d => d['date']).left;
    /* mouseover function to generate crosshair */
    function generateCrosshair() {
        //returns corresponding value from the domain
        const correspondingDate = xScale.invert(d3.mouse(this)[0]);
        //gets insertion point
        const i = bisectDate(data, correspondingDate, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const currentPoint =
            correspondingDate - d0['date'] > d1['date'] - correspondingDate ? d1 : d0;
        focus.attr(
            'transform',
            `translate(${xScale(currentPoint['date'])}, ${yScale(
                currentPoint['value']
            )})`
        );
        focus
            .select('line.x')
            .attr('x1', 0)
            .attr('x2', nw_width - xScale(currentPoint['date']))
            .attr('y1', 0)
            .attr('y2', 0);

        focus
            .select('line.y')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', nw_height - yScale(currentPoint['value']));
    }
}

const movingAverage = (data, numberOfPricePoints) => {
    return data.map((row, index, total) => {
        const start = Math.max(0, index - numberOfPricePoints);
        const end = index;
        const subset = total.slice(start, end + 1);
        const sum = subset.reduce((a, b) => {
            return a + b['value'];
        }, 0);
        return {
            date: row['date'],
            average: sum / subset.length
        };
    });
};

// //////////////////////////////////////////
const insertButton = document.getElementById('insertButton');
insertButton.addEventListener('click', function (e) {
    var assetSelect = document.getElementById('assetSelect');
    var assetName = document.getElementById('assetName');
    var accountName = document.getElementById('accountName');
    var accountValue = document.getElementById('accountValue');

    var assetTypeVal = String(assetSelect.value);
    var assetNameVal = String(assetName.value);
    var accountNameVal = String(accountName.value);
    var accountValueVal = parseFloat(accountValue.value);

    // resets values to empty
    accountName.value = "";
    accountValue.value = "";
    assetName.value = "";

    const response = {
        assetType: assetTypeVal,
        assetName: assetNameVal,
        accountName: accountNameVal,
        accountValue: accountValueVal
    };

    fetch('/insert', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => {
        fetchAssets();
        fetchNetWorth();
    })
        .catch(function (error) {
            console.log(error);
        })

});


fetchAssets();
fetchNetWorth();