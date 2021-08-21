// app.js
console.log('Client-side code running');

const insertButton = document.getElementById('insertButton');
insertButton.addEventListener('click', function (e) {
    console.log('insertButton was clicked');
    var assetSelect = document.getElementById('assetSelect');
    var assetName = document.getElementById('assetName');
    var accountName = document.getElementById('accountName');
    var accountValue = document.getElementById('accountValue');

    var assetTypeVal = String(assetSelect.value);
    var assetNameVal = String(assetName.value);
    var accountNameVal = String(accountName.value);
    var accountValueVal = parseFloat(accountValue.value);

    accountName.value = "";
    accountValue.value = "";

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
    }).then(res => res.json())
        .then(json => console.log("response: " + json))
        .catch(function (error) {
            console.log(error);
        });
});

const queryButton = document.getElementById('queryButton');
queryButton.addEventListener('click', function (e) {
    console.log('queryButton was clicked');

    var tName = String(document.getElementById('tableSelect').value);
    const response = {
        tableName: tName,
    };

    const queryTextArea = document.getElementById('queryTextArea');
    fetch('/query', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
        .then(function (json) {
            var queryTextAreaStr = "";
            for (let i = 0; i < json.length; i++) {
                const j = JSON.parse(json[i]);
                queryTextAreaStr += "-------------------------------\r\n";
                queryTextAreaStr += "insert Time: " + j["insertTime"] + "\r\n";
                queryTextAreaStr += "account Value: " + j["accountvalue"] + "\r\n";
                queryTextAreaStr += "account Name: " + j["accountName"] + "\r\n";
                queryTextAreaStr += "\r\n-------------------------------\r\n";
            }
            queryTextArea.value = queryTextAreaStr;
        })
        .catch(function (error) {
            console.log(error);
        });
});

const addVoteButton = document.getElementById('addVoteButton');
addVoteButton.addEventListener('click', function (e) {
    var teamName = String(document.getElementById('pollSelect').value);
    const response = {
        name: teamName
    };

    console.log("Sending team name: " + teamName);
    fetch('/addPoll', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => fetchPollText())
        .catch(function (err) {
            console.error(err);
        })
});

// set the dimensions and margins of the graph
const margin = 200;
const width = 1000 - margin;
const height = 1000 - margin;

const radius = Math.min(width, height) / 2 - margin;

// append the container for the graph to the page
const container = d3
    .select('body')
    .append('div')
    .attr('class', 'container');

container.append('h1').text('Who will win the 2018/19 Premier League Season?');

// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = container
    .append('svg')
    .attr("width", width)
    .attr("height", height)
    .append('g')
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

var pie = d3.pie()
    .sort(null)
    .value(function (d) { return d[1]; })

var arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius * 0.8)

var outerArc = d3.arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9)

const color = d3.scaleOrdinal()
    .domain(["Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United"])
    .range(d3.schemeDark2);

// Get the poll data from the `/poll` endpoint
async function fetchPollText() {
    fetch('http://localhost:8080/poll')
        .then(response => response.json())
        .then(poll => {
            console.log("Poll: " + JSON.stringify(poll));
            const data_ready = pie(Object.entries(poll));
            console.log(data_ready);
            update(data_ready, arc, outerArc);
            return data_ready;
        });
}

function update(data_ready, arc, outerArc) {
    d3.selectAll("g > *").remove();
    // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
    svg
        .selectAll('allSlices')
        .data(data_ready)
        .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)

    // Add the polylines between chart and labels:
    svg
        .selectAll('allPolylines')
        .data(data_ready)
        .join('polyline')
        .attr("stroke", "black")
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function (d) {
            const posA = arc.centroid(d) // line insertion in the slice
            const posB = outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
            const posC = outerArc.centroid(d); // Label position = almost the same as posB
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        })

    // Add the polylines between chart and labels:
    svg
        .selectAll('allLabels')
        .data(data_ready)
        .join('text')
        .text(d => d.data[0] + " " + d.data[1] + " votes")
        .attr('transform', function (d) {
            const pos = outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style('text-anchor', function (d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        })
    console.log("Done");
}

fetchPollText();