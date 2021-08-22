
data = [
    { date: new Date(2020, 1), high: 10.1, low: 9.1, open: 9.2, close: 9.4, volume: 2000 },
    { date: new Date(2020, 2), high: 11.1, low: 8.1, open: 9.2, close: 10.4, volume: 1000 },
    { date: new Date(2020, 3), high: 12.1, low: 10.1, open: 10.2, close: 11.4, volume: 3000 },
    { date: new Date(2020, 4), high: 11.1, low: 9.1, open: 10.2, close: 10.4, volume: 4000 },
    { date: new Date(2020, 5), high: 9.1, low: 8.1, open: 8.2, close: 8.4, volume: 2000 }
]

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

const initialiseChart = data => {
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    console.log("inner width: " + window.innerWidth)
    const width = window.innerWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    // add SVG to the page
    const svg = d3
        .select("#networth-bar")
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .call(responsivefy)
        .append('g')
        .attr('transform', `translate(${margin.left},  ${margin.top})`);

    // find data range
    const xMin = d3.min(data, d => {
        return d['date'];
    });
    const xMax = d3.max(data, d => {
        return d['date'];
    });
    const yMin = d3.min(data, d => {
        return d['close'];
    });
    const yMax = d3.max(data, d => {
        return d['close'];
    });
    // scales for the charts
    const xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([0, width]);
    const yScale = d3
        .scaleLinear()
        .domain([yMin - 5, yMax])
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
            return yScale(d['close']);
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

    const movingAverageData = movingAverage(data, 2);
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
    svg
        .append('path')
        .data([movingAverageData])
        .style('fill', 'none')
        .attr('id', 'movingAverageLine')
        .attr('stroke', '#FF8900')
        .attr('d', movingAverageLine);

    /* Volume series bars */
    const volData = data.filter(d => d['volume'] !== null && d['volume'] !== 0);
    const yMinVolume = d3.min(volData, d => {
        return Math.min(d['volume']);
    });
    const yMaxVolume = d3.max(volData, d => {
        return Math.max(d['volume']);
    });
    const yVolumeScale = d3
        .scaleLinear()
        .domain([yMinVolume, yMaxVolume])
        .range([height, 0]);

    svg
        .selectAll()
        .data(volData)
        .enter()
        .append('rect')
        .attr('x', d => {
            return xScale(d['date']);
        })
        .attr('y', d => {
            return yVolumeScale(d['volume']);
        })
        .attr('fill', (d, i) => {
            if (i === 0) {
                return '#03a678';
            } else {
                return volData[i - 1].close > d.close ? '#c0392b' : '#03a678';
            }
        })
        .attr('width', 1)
        .attr('height', d => {
            return height - yVolumeScale(d['volume']);
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
    const bisectDate = d3.bisector(d => d.date).left;
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
                currentPoint['close']
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
            .attr('y2', height - yScale(currentPoint['close']));

        // updates the legend to display the date, open, close, high, low, and volume of the selected mouseover area
        updateLegends(currentPoint);
    }

}

const movingAverage = (data, numberOfPricePoints) => {
    return data.map((row, index, total) => {
        const start = Math.max(0, index - numberOfPricePoints);
        const end = index;
        const subset = total.slice(start, end + 1);
        const sum = subset.reduce((a, b) => {
            return a + b['close'];
        }, 0);
        return {
            date: row['date'],
            average: sum / subset.length
        };
    });
};

const updateLegends = currentData => {
    d3.selectAll('.lineLegend').remove();
    const legendKeys = Object.keys(data[0]);
    const lineLegend = svg
        .selectAll('.lineLegend')
        .data(legendKeys)
        .enter()
        .append('g')
        .attr('class', 'lineLegend')
        .attr('transform', (d, i) => {
            return `translate(0, ${i * 20})`;
        });
    lineLegend
        .append('text')
        .text(d => {
            if (d === 'date') {
                return `${d}: ${currentData[d].toLocaleDateString()}`;
            } else if (d === 'high' || d === 'low' || d === 'open' || d === 'close') {
                return `${d}: ${currentData[d].toFixed(2)}`;
            } else {
                return `${d}: ${currentData[d]}`;
            }
        })
        .style('fill', 'white')
        .attr('transform', 'translate(15,9)');
};

initialiseChart(data);