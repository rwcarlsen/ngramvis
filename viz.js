// tooltip stuff:
var tooltip = d3.select("#tooltip")
  .style("position", "absolute")
  .style("color", "green")
  .style("background-color", "lightgrey")
  .style("font-size", "20")
  .style("font-weight", "bold")
  .style("visibility", "hidden")

// load external word data
var data = [];
var num_datums = 100;

var max_iter = 25;
var count = 0;
while(data.length < num_datums) {
  d3.json("/data/" + data.length + "/" + 10, function(json) {
    data = data.concat(json);
    renderVis();
  })
  if (count == max_iter) {break;}
  count++
}

// render the data
function renderVis() {

  var h = 750;
  var w = 1200;
  var pad = 100
  var r = 3;
  var rbig = 8;

  bkmin = 10000
  bkmax = d3.max(data, function(d) {return d.Y;})

  dmin = d3.min(data, function(d) {return d.X;})
  dmax = d3.max(data, function(d) {return d.X;})

  var xscale = d3.scale.log()
   .domain([dmin, dmax])
   .range([0+pad, w-pad])
  var yscale = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([h-pad, 0+pad])

  var viz = d3.select("#viz")
  .append("svg:svg")
  .attr("width", w)
  .attr("height", h);

  var circle = viz.selectAll("circle")
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
            return d.Word + " : den=" + String(d.X) + ", #bks=" + String(d.Y);
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

