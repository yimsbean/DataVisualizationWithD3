
const width = 760, height = 700;

const colors = [
    '#469990', '#aaffc3', '#ffd8b1', 
    '#fabebe', '#f58231', '#f58231', 
    '#ffe119', '#42d4f4', '#9A6324'
];

// The columns from the dataset that we are interested in
const cols = [
    'drovealone',
    'nowork',
    'transit',
    'carpool_dr',
    'carpool_pa',
    'bicycle',
    'motorcycle',
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
          .attr('fill', (d) => { 
                const communityCode = d.properties.comm_code;
                const comm = communities[communityCode];
                if (!comm) {
                    // 'Disabled' color for communities we don't have data for
                    return '#EBEBE4';
                }

                let max = null; 
                for (c in comm) {
                    if (cols.includes(c)) { 
                        if (max === null) { max = c; } 
                        if (comm[c] > comm[max]) { 
                            max = c;
                        }
                    } 
                };

                if (comm[max] === 0) {
                    return '#EBEBE4'; 
                }
                return getAssignedColor(max);

            });

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
                let xPosition = d3.mouse(this)[0] + 10;
                let yPosition = d3.mouse(this)[1] + 20;
                tooltip.attr('transform', 'translate(' + xPosition + ',' + yPosition + ')');
                tooltip.select('text').text(d.properties.name);
                tooltip.select('rect')
                    .attr('width', Math.round(
                        tooltip.select('text').node().getComputedTextLength()) + 20 );
            });

        // Label for each community
        group.append('text')
            .attr('x', (d) => { return path.centroid(d)[0] })
            .attr('y', (d) => { return path.centroid(d)[1] })
            .attr('text-anchor', 'middle')
            .attr('class', 'text-label')
            .text(d => { return d.properties.comm_code });

        // legend label
        legendContainer.append('text')
            .attr('x', width - 200)
            .attr('y', 9.5)
            .attr('font-size', 9)
            .attr('dy', '0.32em')
            .attr('class', 'legend-text')
            .text('MAJORITY MODE OF');
        legendContainer.append('text')
            .attr('x', width - 200)
            .attr('y', 22)
            .attr('font-size', 9)
            .attr('dy', '0.32em')
            .attr('class', 'legend-text')
            .text('TRAVEL TO WORK');

        // create legend
        let legend = legendContainer.append('g')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 10)
            .attr('text-anchor', 'end')
            .selectAll('g')
            .data(travelModes)
            .enter()
            .append('g')
              .attr('transform', (d, i) => { return 'translate(0,' + i * 20 + ')'; });

        // legend value colors
        legend.append('rect')
            .attr('x', width - 200)
            .attr('y', 30)
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', (d) => {
                return getAssignedColor(d);
            });

        // legend value text
        legend.append('text')
            .attr('x', width - 180)
            .attr('y', 38)
            .attr('dy', '0.32em')
            .attr('class', 'legend-text')
            .attr('text-anchor', 'end')
            .text((d) => {
                switch (d) {
                    case 'drovealone':
                        return 'drove alone';
                    case 'nowork':
                        return 'unemployed';
                    case 'transit':
                        return d;
                    case 'carpool_dr':
                        return 'carpool (driver)';
                    case 'carpool_pa':
                        return 'carpool (rider)';
                    case 'bicycle':
                        return d;
                    case 'motorcycle':
                        return d;
                    case 'walk':
                        return d;
                    case 'work_home':
                        return 'works at home';
                }
                return d;
            });

        // Data source text
        legendContainer.append('text')
            .attr('x', 0)
            .attr('y', height - 20)
            .attr('font-size', 12)
            .attr('dy', '0.32em')
            .attr('class', 'legend-text')
            .text('Source: Calgary Civic Census 2016');
    });
});

function createTooltip() {
    // create tooltip
    let tooltip = d3.select('svg')
    .append('g')
        .attr('class', 'tooltip')
        .style('display', 'none');

    tooltip.append('rect')
        .attr('x', 20)
        .attr('rx', '20')
        .attr('ry', '20')
        .attr('height', 20)
        .attr('fill', 'black')
        .style('opacity', 0.75);

    tooltip.append('text')
        .attr('x', 30)
        .attr('dy', '1.2em')
        .style('text-anchor', 'start')
        .attr('font-size', '12')
        .attr('fill', 'white')
        .attr('font-weight', 'bold');
    
    return tooltip;
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

function getAssignedColor(modeOfTravel) {
    switch (modeOfTravel) {
        case 'drovealone':
            return '#469990';
        case 'nowork':
            return '#aaffc3';
        case 'transit':
            return '#fffac8';
        case 'carpool_dr':
            return '#ffd8b1';
        case 'carpool_pa':
            return '#fabebe';
        case 'bicycle':
            return '#f58231';
        case 'motorcycle':
            return '#ffe119';
        case 'walk':
            return '#42d4f4';
        case 'work_home':
            return '#9A6324';
        default:
            return '#EBEBE4';
    }
}