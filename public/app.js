// set variables for pie_chart
const pie_margin = 100;
const pie_width = 600 - pie_margin;
const pie_height = 600 - pie_margin;

const radius = Math.min(pie_width, pie_height) / 2 - pie_margin;

// append the container for the graph to the page

// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var asset_data = {};
var using_asset_data = true;

const mouseOverHandler = function(d) {
  d3.select(this).transition()
  .duration(1000)
  .attr("d", outerArcGenerator);
}

const mouseOutHandler = function(d) {
  d3.select(this).transition()
  .duration(1000)
  .attr("d", arcGenerator);
}

const clickHandler = async function(d) {
  await updatePieData(d["data"][0]);
}

var asset_pie = d3.select("#asset-pie")
    .append('svg')
    .attr("width", pie_width)
    .attr("height", pie_height);

var renderarcs = asset_pie.append('g')
    .attr("transform", `translate(${pie_width / 2}, ${pie_height / 2})`)
    .selectAll('.arc')
    .enter()
    .append('g')
    .attr('class', "arc");

renderarcs.append("path")
  .attr('d', arcGenerator)
  .attr('fill', d => color(d.data[0]))
  .on("mouseover", mouseOverHandler)
  .on("mouseout", mouseOutHandler)
  .on("click", clickHandler);


var arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(radius);

var outerArcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(radius+10);

var color = d3.scaleOrdinal()
    .domain(["cash", "crypto", "investments"])
    .range(d3.schemeDark2);

var pie = d3.pie()
  .value(function(d) {return d[1]; })

// end variables for pie chart

// functions related to pie charts
// Get the poll data from the `/poll` endpoint
async function fetchAssets() {
    fetch('http://localhost:8080/assets')
        .then(response => response.json())
        .then(assets => {
            asset_data = assets;
            const data_ready = pie(Object.entries(asset_data));
            updatePie(data_ready);
        });
}

function updatePie(data_ready) {
    // remove all old properties
    asset_pie.selectAll("g > *").remove();
    // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.

    renderarcs = asset_pie.append('g')
        .attr("transform", `translate(${pie_width / 2}, ${pie_height / 2})`)
        .selectAll('.arc')
        .data(data_ready)
        .enter()
        .append('g')
        .attr('class', "arc");

    renderarcs.append("path")
      .on("mouseover", mouseOverHandler)
      .on("mouseout", mouseOutHandler)
      .on("click", clickHandler)
      .attr('d', arcGenerator)
      .attr('fill', d => color(d.data[0]));

    renderarcs.append('text')
      .text(function(d){ return d.data[0] })
      .attr("transform", function(d) { return "translate(" + arcGenerator.centroid(d) + ")";  })

    renderarcs.append('text')
      .attr("dy", "1em")
      .text(function(d){ return "$" + d.data[1]})
      .attr("transform", function(d) { return "translate(" + arcGenerator.centroid(d) + ")";  })

}

function setRevertPieVisibility() {
  let visible = "visible";
  if(using_asset_data == true) {
    visible = "hidden";
  }
  document.getElementById("revertPieButton").style.visibility = visible;
}

function revertPie() {
  const data_ready = pie(Object.entries(asset_data));
  using_asset_data = true;
  setRevertPieVisibility();
  updatePie(data_ready);
}

const revertPieButton = document.getElementById('revertPieButton');
revertPieButton.addEventListener('click', async function (e) {
  revertPie();
});

async function updatePieData(asset_type) {
  if(using_asset_data == true) {
    using_asset_data = false;
    fetch('http://localhost:8080/assetTypeData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            asset_type : asset_type
        })
      }).then(res => res.json())
      .then(assets => {
        var data = {};
        var new_colors = [];
        for(let i = 0; i < assets.length; i++) {
          var item = assets[i];
          var data_item = {};
          data[item["asset_name"]] = parseFloat(item["value"]);
          new_colors.push(item["asset_name"]);
        }
        color = d3.scaleOrdinal()
            .domain(new_colors)
            .range(d3.schemeDark2);
        updatePie(pie(Object.entries(data)));
        setRevertPieVisibility();
      }).catch(function (error) {
          console.log(error);
      })
    }
}
// end functions related to pie charts


// set variables for net-worth chart
// add SVG to the page
const nw_margin = { top: 50, right: 50, bottom: 50, left: 50 };
const nw_width = window.innerWidth - nw_margin.left - nw_margin.right;
const nw_height = 400 - nw_margin.top - nw_margin.bottom;
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
        .then(async networth => {
            // for some reason date conversion doesn't work on server side, so do it on client side
            for (let i = 0; i < networth.length; i++) {
                networth[i].date = new Date(networth[i].date);
            }
            const sortedNetWorth = networth.sort(function (a, b) { return a.date - b.date });
            await updateChart(sortedNetWorth);
        });
}

async function fetchNetWorthDate(startDate, endDate) {
    console.log("start: " + startDate + " end: " + endDate);
    fetch('http://localhost:8080/networth-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startDate: startDate,
            endDate: endDate
        })
    }) .then(response => response.json())
            .then(async networth => {
                // for some reason date conversion doesn't work on server side, so do it on client side
                for (let i = 0; i < networth.length; i++) {
                    networth[i].date = new Date(networth[i].date);
                }
                const sortedNetWorth = networth.sort(function (a, b) { return a.date - b.date });
                await updateChart(sortedNetWorth);
            });
}
// add SVG to the page

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
const updateDateRange = function (svg, firstDate, data) {
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


const updateChart = async data => {
    console.log("updating chart: " + data.length);
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

    const movingAverageData = movingAverage(data, data.length/2);
    // generates moving average curve when called
    const movingAverageLine = d3
        .line()
        .x(d => {
            return xScale(d['date']);
        })
        .y(d => {
            return yScale(d['average']);
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

    var focusText = networthBar
        .append('g')
        .append('text')
        .style("opacity", 0)
        .attr("text-anchor", "left")
        .attr("alignment-baseline", "middle")

    focus.append('circle').attr('r', 4.5);
    networthBar
        .append('rect')
        .attr('class', 'overlay')
        .attr('width', nw_width)
        .attr('height', nw_height)
        .on('mouseover', () => { focus.style('display', null); focusText.style("opacity", 1); })
        .on('mouseout', () => { focus.style('display', 'none'); focusText.style("opacity", 0); })
        .on('mousemove', generateCrosshair);

    d3.select('.overlay').style('fill', 'none');
    d3.select('.overlay').style('pointer-events', 'all');

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
        focusText
            .html("value: " + currentPoint['value'] + " date: " + currentPoint['date'])
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
    }).catch(function (error) {
          console.log(error);
      })

});

function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms)
        end = new Date().getTime();
}

const oneWeekButton = document.getElementById('1week');
oneWeekButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setDate(start.getDate() - 7);
    await fetchNetWorthDate(start, today);
});

const oneMonthButton = document.getElementById('1month');
oneMonthButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 1);
    await fetchNetWorthDate(start, today);
});

const threeMonthButton = document.getElementById('3month');
threeMonthButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 3);
    await fetchNetWorthDate(start, today);
});

const sixMonthButton = document.getElementById('6month');
sixMonthButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 6);
    await fetchNetWorthDate(start, today);
});

const oneYearButton = document.getElementById('1year');
oneYearButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 12);
    await fetchNetWorthDate(start, today);
});

const threeYearButton = document.getElementById('3year');
threeYearButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 36);
    await fetchNetWorthDate(start, today);
});

const fiveYearButton = document.getElementById('5year');
threeYearButton.addEventListener('click', async function (e) {
    var today = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 60);
    await fetchNetWorthDate(start, today);
});

const lifetimeButton = document.getElementById('lifetime');
lifetimeButton.addEventListener('click', async function (e) {
    await fetchNetWorth();
});

async function fetchData() {
    await fetchAssets();
    await fetchNetWorth();
}

function addData(startDate, endDate) {
  console.log("adding data");
    fetch('/insertAssetTimeTest', {
        method: 'POST',
        body: JSON.stringify({ startDate: startDate, endDate: endDate }),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => console.log(res)
    ).catch(function (error) {
            console.log(error);
        })
}

var startdate = new Date();
var enddate = new Date();
enddate.setMonth(enddate.getMonth() - 60);
//addData(startdate, enddate);
fetchData();
