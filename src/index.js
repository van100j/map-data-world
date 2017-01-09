import * as d3 from "d3"
import * as topojson from "topojson"

const body = d3.select("body");
const {width, height} = body.node().getBoundingClientRect();

// SVG
const svg = body.append("svg").attr("width", width).attr("height", height);
const atlas = svg.append("g").attr("class", "world")
const meteorites = svg.append("g").attr("class", "meteorites").style("opacity", 0);

// Scales & colors
const sizeScale = d3.scalePow();
sizeScale.exponent(.35);
sizeScale.ticks(5);
sizeScale.range([3, 30]);
const color = d3.scaleOrdinal(d3.schemeCategory20);

// Tooltip
const tooltip = body.append("div").attr("class", "tooltip").style("opacity", 0);

// Geo
const scale0 = width/640*90;
const projection = d3.geoMercator().translate([width/2, 9*height/16]).scale(scale0);//.scale(width/640 * 90);
const path = d3.geoPath(projection);

// Zoom
const zoom = d3.zoom()
               .scaleExtent([scale0, 8 * scale0])
               .on("zoom", zoomed);

d3.json('https://d3js.org/world-110m.v1.json', (err, world) => {

  if(err) throw err;

  const countries = topojson.feature(world, world.objects.countries).features;
  atlas.selectAll("path")
       .data(countries)
       .enter().append("path")
       .attr("d", path);

  meteorites.transition(250).style("opacity", .99);

  svg.call(zoom);

  const [tx, ty] = projection.translate();
  zoom.transform(svg, d3.zoomIdentity.translate(tx, ty).scale(projection.scale()));
});

d3.json('https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/meteorite-strike-data.json', (err, json) => {
  if(err) throw err;

  // filter points w/o coordinates, and put smaller on top of bigger
  const data = json.features.filter((item) => !!item.geometry).sort((a, b) => +a.properties.mass == +b.properties.mass ? 0 : +a.properties.mass < +b.properties.mass ? 1 : -1);

  sizeScale.domain([d3.min(data, d => +d.properties.mass), d3.max(data, d => +d.properties.mass)]);

  meteorites.selectAll("circle")
            .data(data)
            .enter().append("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", d => sizeScale(d.properties.mass))
            .style("stroke", "rgba(255, 255, 255, .75)")
            .style("fill", (d, i) => color(i))
            .on("mouseenter", (d, i) => {
                let [left, top] = projection(d.geometry.coordinates);
                if(width - left < 300) {
                  left -= 100;
                  top += 10;
                }
                tooltip.html(
                          "<strong>" + d.properties.name + ", " + d3.timeFormat("%Y")(new Date(d.properties.year)) + "</strong>" +
                          "Class: " + d.properties.recclass + "<br>" +
                          "Mass: " + d3.format(",.0f")(d.properties.mass)
                        )
                        .transition()
                        .duration(50)
                        .style("transform", "translate3d(" + left + "px, " + top + "px, 0)" )
                        .style("visibility", "visible")
                        .style("opacity", .9);
            })
            .on("mouseleave", function(d) {
                  tooltip.transition()
                         .duration(500)
                         .style("opacity", 0)
                         .style("visibility", "hidden");;
            });
});

function zoomed() {

  const {x, y, k} = d3.event.transform;

  projection.translate([x, y]).scale(k);
  atlas.selectAll("path").attr("d", path);

  //meteorites.attr("transform", "translate(" + x + ", " + y + ") scale(" + k / scale0 + ")");
  meteorites.selectAll("circle").attr("cx", d => projection(d.geometry.coordinates)[0]).attr("cy", d => projection(d.geometry.coordinates)[1]);
}
