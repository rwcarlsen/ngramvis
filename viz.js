// global variables
var h = 750;
var w = 1200;
var r = 3;
var rbig = 8;
var pad = rbig + 10

var data = [];
var num_datums = 2500;
var chunk_size = 500;

// tooltip stuff:
var tooltip = d3.select("#tooltip")
  .style("position", "absolute")
  .style("color", "green")
  .style("background-color", "lightgrey")
  .style("font-size", "20")
  .style("font-weight", "bold")
  .style("visibility", "hidden")

// create svg drawing board
var viz = d3.select("#viz")
  .append("svg:svg")
  .attr("width", w)
  .attr("height", h);

// load external word data - note asynchrous behavior (parallel requests)
for (i = 0; i < num_datums; i += chunk_size) {
  if (i > num_datums) {i = num_datums;}
  d3.json("/data/" + i + "/" + chunk_size, function(json) {renderVis(json);});
}

function renderVis(newdata) {
  data = data.concat(newdata)

  // calc max/min and calibrate axis scales
  bkmin = d3.min(data, function(d) {return d.Y;})
  bkmax = d3.max(data, function(d) {return d.Y;})

  dmin = d3.min(data, function(d) {return d.X;})
  dmax = d3.max(data, function(d) {return d.X;})

  var xscale = d3.scale.log()
   .domain([dmin, dmax])
   .range([0+pad, w-pad])
  var yscale = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([h-pad, 0+pad])

  var circle = viz.selectAll("circle")

  // update existing circles to updated scales
  circle
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})

  // add new circles
  circle.data(data)
    .enter().append("svg:circle")
    .style("stroke", "red")
    .style("fill", "black")
    .attr("r", r)
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})
    .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", "blue")
          .attr("r", rbig);
        return tooltip
          .style("visibility", "visible")
          .style("top", event.pageY+"px").style("left",(event.pageX+15)+"px")
          .text(function() {
            return d.W + " : den=" + String(d.X) + ", #bks=" + String(d.Y);
          });
    })
    .on("mousemove", function(){
      return tooltip;
    })
    .on("mouseout", function(){
        d3.select(this)
          .attr("r", r)
          .style("fill", "black");
        return tooltip.style("visibility", "hidden");
      })

}

