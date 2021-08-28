

// add SVG to the page
const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const width = window.innerWidth - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;
const svg = d3
    .select("#networth-bar")
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .call(responsivefy)
    .append('g')
    .attr('transform', `translate(${margin.left},  ${margin.top})`);

async function fetchNetWorth() {
    fetch('http://localhost:8080/networth')
        .then(response => response.json())
        .then(networth => {
            // for some reason date conversion doesn't work on server side, so do it on client side
            for (let i = 0; i < networth.length; i++) {
                networth[i].date = new Date(networth[i].date);
                console.log(networth[i].date instanceof Date);
            }
            const sortedNetWorth = networth.sort(function (a, b) { return a.date - b.date });
            updateChart(sortedNetWorth);
        });
}

function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style("width")),
        height = parseInt(svg.style("height")),
        aspect = width / height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
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

// set the dimensions and margins of the graph
const updateDateRange = function (svg, firstDate) {
    // first null out attribute to remove it

    xMin = firstDate;
    xMax = new Date();

    const xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([0, width])

    svg
        .selectAll("g")
        .data(data)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(xScale));
}


const updateChart = data => {
    // remove all old properties
    svg.selectAll("g > *").remove();

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
        .range([0, width]);
    const yScale = d3
        .scaleLinear()
        .domain([0, yMax])
        .range([height, 0]);

    // create the axes component
    svg
        .append('g')
        .attr('id', 'xAxis')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));
    svg
        .append('g')
        .attr('id', 'yAxis')
        .attr('transform', `translate(${width}, 0)`)
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
    svg
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
    svg
        .append('path')
        .data([movingAverageData])
        .style('fill', 'none')
        .attr('id', 'movingAverageLine')
        .attr('stroke', '#FF8900')
        .attr('d', movingAverageLine);

    /* Volume series bars */
    let volData = []
    for (let i = data.length-1; i > 0; i--) {
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
        .range([0, height/2]);

    svg
        .selectAll()
        .data(volData)
        .enter()
        .append('rect')
        .attr('x', d => {
            return xScale(d['date']);
        })
        .attr('y', d => {
            return height - yVolumeScale(Math.abs(d['value']));
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
    const focus = svg
        .append('g')
        .attr('class', 'focus')
        .style('display', 'none');
    focus.append('circle').attr('r', 4.5);
    focus.append('line').classed('x', true);
    focus.append('line').classed('y', true);
    svg
        .append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
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
            .attr('x2', width - xScale(currentPoint['date']))
            .attr('y1', 0)
            .attr('y2', 0);

        focus
            .select('line.y')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', height - yScale(currentPoint['value']));
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

fetchNetWorth();

var d = new Date();
d.setMonth(d.getMonth() - 12);

//updateDateRange(svg, d);