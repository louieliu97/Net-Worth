// app.js
console.log('Client-side code running');

// set the dimensions and margins of the graph
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

// Get the poll data from the `/poll` endpoint
async function fetchAssets() {
    fetch('http://localhost:8080/assets')
        .then(response => response.json())
        .then(assets => {
            console.log(JSON.stringify(assets));
            const data_ready = pie(Object.entries(assets));
            updatePie(data_ready, pie_arc, pie_outerArc);
            return data_ready;
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
    }).then(res => fetchAssets())
        .catch(function (error) {
            console.log(error);
        });
});

fetchAssets();