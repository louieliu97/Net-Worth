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
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// set the ranges for the graph
const x = d3
    .scaleBand()
    .range([0, width])
    .padding(0.1);

const y = d3.scaleLinear().range([height, 0]);

// append the container for the graph to the page
const container = d3
    .select('body')
    .append('div')
    .attr('class', 'container');

container.append('h1').text('Who will win the 2018/19 Premier League Season?');

// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
const svg = container
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Create a skeleton structure for a tooltip and append it to the page
const tip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip');

// Get the poll data from the `/poll` endpoint
async function fetchPollText() {
    fetch('http://localhost:8080/poll')
        .then(response => response.json())
        .then(poll => {
            svg
                .append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .attr('class', 'x-axis')
                .call(d3.axisBottom(x));

            // add the y Axis
            svg
                .append('g')
                .attr('class', 'y-axis')
                .call(d3.axisLeft(y));

            update(poll);
        });
}

function update(poll) {
    // Scale the range of the data in the x axis
    x.domain(
        poll.map(d => {
            return d.name;
        })
    );

    // Scale the range of the data in the y axis
    y.domain([
        0,
        d3.max(poll, d => {
            return d.votes + 200;
        }),
    ]);

    // Select all bars on the graph, take them out, and exit the previous data set.
    // Enter the new data and append the rectangles for each object in the poll array
    svg
        .selectAll('.bar')
        .remove()
        .exit()
        .data(poll)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => {
            return x(d.name);
        })
        .attr('width', x.bandwidth())
        .attr('y', d => {
            return y(d.votes);
        })
        .attr('height', d => {
            return height - y(d.votes);
        })
        .on('mousemove', d => {
            tip
                .style('position', 'absolute')
                .style('left', `${d3.event.pageX + 10}px`)
                .style('top', `${d3.event.pageY + 20}px`)
                .style('display', 'inline-block')
                .style('opacity', '0.9')
                .html(
                    `<div><strong>${d.name}</strong></div> <span>${d.votes} votes</span>`
                );
        })
        .on('mouseout', () => tip.style('display', 'none'));

    // update the x-axis
    svg.select('.x-axis').call(d3.axisBottom(x));

    // update the y-axis
    svg.select('.y-axis').call(d3.axisLeft(y));
}

fetchPollText();