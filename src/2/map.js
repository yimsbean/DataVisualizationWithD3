
const width = 760, height = 700;

const colors = [
    '#469990', '#aaffc3', '#ffd8b1', 
    '#fabebe', '#f58231', '#f58231', 
    '#ffe119', '#469990', '#9A6324'
];

// The columns from the dataset that we are interested in
const cols = [
    'bicycle',
    'carpool_dr',
    'carpool_pa',
    'drovealone',
    'motorcycle',
    'nowork',
    'transit',
    'walk',
    'work_home'
];

let canvas = d3.select('#chart')
    .append('svg')
       .attr('width', width)
       .attr('height', height);

let legendContainer = d3.select('svg').append('g')
    .attr('transform', 'translate(' + 100 + ',0)');

d3.json('../../data/geoJson/Community_Boundaries.geojson', (jsonData) => {
    d3.csv('../../data/Modes_of_Travel.csv', (d, i, columns) => {
        return processCsvRow(d, i, columns);
    }, (error, csvData) => {
        if (error) throw error;

        const travelModes = csvData.columns.filter((c) => {
            return cols.includes(c);
        });
        travelModes.push('unavailable');

        // Create a dictionary mapping comm_code to csvData for faster lookup
        let communities = {};
        csvData.forEach(community => {
            communities[community.comm_code] = community;
        });

        // Add a <g> element for each of the communities in the data
        let group = canvas.selectAll('g')
        .data(jsonData.features)
        .enter()
        .append('g')
          .attr('class', 'community')
          .attr('fill', '#EBEBE4');

        // Set the d3 geo projection and path
        const projection = d3.geoMercator().fitSize([width, height], jsonData);
        const path = d3.geoPath().projection(projection);

        // Append path to all the <g> elements
        let areas = group.append('path')
            .attr('d', path)
            .attr('class', 'area')

        // Add tooltip to the each community path element
        let tooltip = createTooltip();
        areas.on('mouseover', () => { tooltip.style('display', null); })
            .on('mouseout', () => { tooltip.style('display', 'none'); })
            .on('mousemove', function(d) {
                let dataIsAvailable = !!communities[d.properties.comm_code];
                let tooltipHeight = 20;
                let tooltipWidth = 0;
                let xPosition = d3.mouse(this)[0] + 10;
                let yPosition = d3.mouse(this)[1] + 20;
                tooltip.attr('transform', 'translate(' + xPosition + ',' + yPosition + ')');
                tooltip.select('text').text(d.properties.name);
                tooltipWidth = getTooltipWidth(d.properties.name, tooltipWidth);

                if (dataIsAvailable) {
                    tooltipHeight = 20 + (cols.length * 20);    // height required to accomodate all the available data and the community name

                    cols.forEach(c => {
                        tooltip.select('text')
                        .append('svg:tspan')
                        .attr('x', 0)
                        .attr('dy', 20)
                        .text(c + ': ' + communities[d.properties.comm_code][c])
                          .attr('x', 10);
                        tooltipWidth = 
                            getTooltipWidth(c + ': ' + 
                                communities[d.properties.comm_code][c], tooltipWidth);
                    });
                }

                tooltip.select('rect')
                    .attr('width', tooltipWidth)
                    .attr('height', tooltipHeight);
            });

        // Label for each community
        group.append('text')
            .attr('x', (d) => { return path.centroid(d)[0] })
            .attr('y', (d) => { return path.centroid(d)[1] })
            .attr('text-anchor', 'middle')
            .attr('class', 'text-label')
            .text(d => { return d.properties.comm_code });
    });
});

function createTooltip() {
    // create tooltip
    let tooltip = d3.select('svg')
        .append('g')
            .attr('class', 'tooltip')
            .style('display', 'none');

    tooltip.append('rect')
        .attr('fill', 'black')
        .style('opacity', 0.75);

    tooltip.append('text')
        .attr('x', 10)
        .attr('dy', '1.2em')
        .style('text-anchor', 'start')
        .attr('font-size', '12')
        .attr('fill', 'white')
        .attr('font-weight', 'bold');
    
    return tooltip;
}

function getTooltipWidth(text, currentTooltipWidth) {

    let tooltip = d3.select('svg')
        .append('g')
            .attr('class', 'tooltip')
            .style('display', 'none')
            .attr('id', '#temp');

    tooltip.append('text')
        .attr('x', 10)
        .attr('dy', '1.2em')
        .style('text-anchor', 'start')
        .attr('font-size', '12')
        .attr('fill', 'white')
        .attr('font-weight', 'bold');

    tooltip.select('text').text(text);

    const tempWidth = Math.round(tooltip.select('text').node().getComputedTextLength()) + 20;
    if (tempWidth > currentTooltipWidth) {
        d3.select('#temp').remove();
        return tempWidth;
    }
    d3.select('#temp').remove();
    return currentTooltipWidth;
}

function processCsvRow(d, i, columns) {
    // Convert all quantative values to numbers
    d.bicycle = +d.bicycle.replace(/,/g, '');
    d.drovealone = +d.drovealone.replace(/,/g, '');
    d.nowork = +d.nowork.replace(/,/g, '');
    d.motorcycle = +d.motorcycle.replace(/,/g, '');
    d.work_home = +d.work_home.replace(/,/g, '');
    d.transit = +d.transit.replace(/,/g, '');
    d.carpool_dr = +d.carpool_dr.replace(/,/g, '');
    d.carpool_pa = +d.carpool_pa.replace(/,/g, '');
    d.walk = +d.walk.replace(/,/g, '');

    // sum up the totals of people in this community surveyed
    let s = 0;
    for (i = 0; i < columns.length; i++) {
        if (cols.includes(columns[i])) {
            s += d[columns[i]];
        }
    };

    d.sum = s;
    return d;
}