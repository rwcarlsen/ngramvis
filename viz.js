/*path {
    stroke: steelblue;
    stroke-width: 2;
    fill: none;
}
 
line {
    stroke: black;
}
 
text {
    font-family: Arial;
    font-size: 9pt;
}*/


// global variables
var h = 750; //height
var w = 1200; //width
var xOffset = 40
var yOffset = 40

var data = [];

//   length / count / pages / books / pg-den
var weights = "1/0/0/0/.1"
var start_year = 1980;
var num_datums = 1500;
var rmin = 3
var rmax = 10
var pad = rmax + 10 //padding around the graphing space
var transdur = 1000;

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
  .attr("height", h)
  .on("click", function(){
    nextframe()
  });

  // Axes 
  viz.append("svg:line")
    .attr("x1",xOffset)
    .attr("y1",0)
    .attr("x2",xOffset)
    .attr("y2",h-yOffset)
    .attr("stroke","red");
  viz.append("svg:line")
    .attr("x1",xOffset)
    .attr("y1",h-yOffset)
    .attr("x2",w)
    .attr("y2",h-yOffset)
    .attr("stroke","red");
    

// calculates the radius of a datum
function getr(d, minscore, maxscore) {
  return rmin + (d.S - minscore) / (maxscore - minscore + 0.001) * (rmax - rmin);
}

// calculates the mouseover radius of a datum
function getrbig(d, minscore, maxscore) {
  return getr(d, minscore, maxscore) + 2;
}

// key function for d3 data binding
function wordtext(d) {
  return d.W;
}

// load external word data - note asynchrous behavior (parallel requests)
var frame = 0;
nextframe();
function nextframe() {
  d3.json("/data/reweight/" + (start_year + frame) + "/" + weights, function(json) {getData(num_datums);});
  frame += 1;
}

function getData(ndatums) {
  d3.json("/data/" + 0 + "/" + ndatums, function(json) {renderVis(json);});
}

function renderVis(newdata) {
  minscore = d3.min(newdata, function(d) {return d.S})
  maxscore = d3.max(newdata, function(d) {return d.S})
  gbscale = d3.scale.log().domain([minscore, maxscore]).range([255, 0])
  data = newdata;

  // calc max/min and calibrate axis scales
  bkmin = 90
  bkmax = 150000
  dmin = 1
  dmax = 50

  var xscale = d3.scale.log()
   .domain([dmin, dmax])
   .range([0+xOffset+pad, w-pad])
  var yscale = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([h-yOffset-pad, 0+pad])
  
  // Tick marks on axes
  viz.selectAll(".xLabel")
    .data(xscale.ticks(5))
    .enter().append("svg:text")
    .attr("class","xLabel")
    .text(String)
    .attr("x", function(d) {return xscale(d);})
    .attr("y", h)
    .attr("text-anchor", "middle");
  viz.selectAll(".xTicks")
    .data(xscale.ticks(5))
    .enter().append("svg.line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {return xscale(d);})
    .attr("y1", h-yOffset) // probably changing this
    .attr("x2", function(d) {return xscale(d);})
    .attr("y2", h-yOffset-10) // probably changing this
    .attr("stroke", "red");
    
  var yLabels = viz.selectAll(".yLabel")
    .attr("y", function(d) {return yscale(d);})
    
  yLabels.data(yscale.ticks(4))
    .enter().append("svg:text")
    .attr("class","yLabel")
    .text(String)
    .attr("x", 0)
    .attr("y", function(d) {return yscale(d);})
    .attr("text-anchor", "right")
    .attr("dy", 4); //not sure what this line does...
    
  var yTicks = viz.selectAll(".yTicks")
    .attr("y1", function(d) {return yscale(d);})
    .attr("y2", function(d) {return yscale(d);})
    
  yTicks.data(yscale.ticks(4))
    .enter().append("svg.line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {return yscale(d);})
    .attr("x1", 0) // probably changing this
    .attr("y2", function(d) {return yscale(d);})
    .attr("x2", 10) // probably changing this
    .attr("stroke", "red");

  var circle = viz.selectAll("circle")

  // update existing circles to updated scales
  circle.data(data, wordtext)
    .transition()
    .duration(transdur)
    .delay(function(i, d) {return i * 10;})
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})
    .style("fill", function(d) {return d3.rgb(255, gbscale(d.S), gbscale(d.S)).toString();})
    .attr("r", function(d) {return getr(d, minscore, maxscore);});

  // add new circles
  circle.data(data, wordtext)
    .enter().append("svg:circle")
    .attr("r", 0)
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})
    .style("stroke", "black")
    .style("fill", function(d) {return d3.rgb(255, gbscale(d.S), gbscale(d.S)).toString();})
    .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", "blue")
          .attr("r", function() {return getrbig(d, minscore, maxscore);});
        return tooltip
          .style("visibility", "visible")
          .style("top", event.pageY+"px").style("left",(event.pageX+15)+"px")
          .text(function() {
            return d.W + " : den=" + String(d.X) + ", #bks=" + String(d.Y)
                       + ", score=" + String(d.S)
          });
    })
    .on("mousemove", function(){
      return tooltip;
    }) .on("mouseout", function(d){ d3.select(this)
          .attr("r", function() {return getr(d, minscore, maxscore);})
          .style("fill", "black")
          .style("fill", function() {return d3.rgb(255, gbscale(d.S), gbscale(d.S)).toString();});
        return tooltip.style("visibility", "hidden");
      })
    .transition()
    .duration(transdur)
    .attr("r", function(d) {return getr(d, minscore, maxscore);});

  // remove words that are not longer to be displayed
  circle.data(data, wordtext).exit()
    .transition()
    .duration(transdur)
    .attr("r", 0)
    .transition()
    .remove();
}

