/////// adjustable params /////////

// plot canvas dimensions
var vizh = 600;
var vizw = 900;

// radii for datum circles
var rmin = 3
var rmax = 10

var num_datums = 500;
var currYear = 1980

//   length / count / pages / books / pg-den
var weights = "0/0/0/0/0"

// used to prevent recomputation and facilitate access from mouseovers etc.
var minscore
var maxscore
var gbscale

/////// end adjustable params /////////

function initTooltip() {
  fontSize = "20"
  fontColor = "green"
  fontWeight = "bold"
  bgColor = "lightgrey"

  // tooltip stuff:
  var tooltip = d3.select("#tooltip")
    .style("position", "absolute")
    .style("color", fontColor)
    .style("background-color", bgColor)
    .style("font-size", fontSize)
    .style("font-weight", fontWeight)
    .style("visibility", "hidden")
}

function initVizCanvas() {
  var viz = d3.select("#viz")
    .append("svg:svg")
    .attr("width", vizw)
    .attr("height", vizh)
}

function initAxes() {
  var axisColor = "black"

  var xTickLen = 15
  var yTickLen = 15

  scales = makeScales();

  var viz = d3.select("#viz").select("svg")

  var xaxis = d3.svg.axis()
    .scale(scales.x)
    .orient("bottom")
    .ticks(10)
    .tickSize(xTickLen, 0, 0)

  viz.append("svg:g")
    .attr("stroke", axisColor)
    .call(xaxis)

  // axis lines
  //viz.append("svg:line")
  //  .attr("x1", scales.x.range()[0])
  //  .attr("y1", scales.y.range()[0])
  //  .attr("x2", scales.x.range()[1])
  //  .attr("y2", scales.y.range()[0])
  //  .attr("stroke", axisColor);
  viz.append("svg:line")
    .attr("x1", scales.x.range()[0])
    .attr("y1", scales.y.range()[0])
    .attr("x2", scales.x.range()[0])
    .attr("y2", scales.y.range()[1])
    .attr("stroke", axisColor);

  // tick mark labels
  viz.selectAll(".xLabel")
    .data(scales.x.ticks())
    .enter().append("svg:text")
    .attr("class","xLabel")
    .text(scales.x.tickFormat())
    .attr("x", function(d) {return scales.x(d);})
    .attr("y", scales.y.range()[0] + 40)
    .attr("text-anchor", "middle");

  viz.selectAll(".yLabel")
    .data(scales.y.ticks())
    .enter().append("svg:text")
    .attr("class","yLabel")
    .text(scales.y.tickFormat())
    .attr("x", 0)
    .attr("y", function(d) {return scales.y(d);})
    .attr("text-anchor", "right")
    .attr("dy", 4); //not sure what this line does...
    
  // tick marks
  viz.selectAll(".xTicks")
    .data(scales.x.ticks(5))
    .enter().append("svg:line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {return scales.x(d);})
    .attr("y1", scales.y.range()[0] - xTickLen / 2.0)
    .attr("x2", function(d) {return scales.x(d);})
    .attr("y2", scales.y.range()[0] + xTickLen / 2.0)
    .attr("stroke", tickColor);
    
  viz.selectAll(".yTicks")
    .data(scales.y.ticks(4))
    .enter().append("svg:line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {return scales.y(d);})
    .attr("x1", scales.x.range()[0] - yTickLen / 2.0)
    .attr("y2", function(d) {return scales.y(d);})
    .attr("x2", scales.x.range()[0] + yTickLen / 2.0)
    .attr("stroke", tickColor);
}

var wordlengthSlider = d3.select("#wordlengthSlider")
  .append("input")
    .attr("name","wordlength")
    .attr("type","range")
    .attr("min",-10)
    .attr("max",10)
    .attr("value",0)
    .on("change",function(d) {return reweight(this.value,0);})
var countSlider = d3.select("#countSlider")
  .append("input")
    .attr("name","count")
    .attr("type","range")
    .attr("min",-10)
    .attr("max",10)
    .attr("value",0)
    .on("change",function(d) {return reweight(this.value,1);})
var pagesSlider = d3.select("#pagesSlider")
  .append("input")
    .attr("name","pages")
    .attr("type","range")
    .attr("min",-10)
    .attr("max",10)
    .attr("value",0)
    .on("change",function(d) {return reweight(this.value,2);})
var booksSlider = d3.select("#booksSlider")
  .append("input")
    .attr("name","books")
    .attr("type","range")
    .attr("min",-10)
    .attr("max",10)
    .attr("value",0)
    .on("change",function(d) {return reweight(this.value,3);})
var pdSlider = d3.select("#pdSlider")
  .append("input")
    .attr("name","pd")
    .attr("type","range")
    .attr("min",-10)
    .attr("max",10)
    .attr("value",0)
    .on("change",function(d) {return reweight(this.value,4);})


// calculates the radius of a datum
function getr(d) {
  if (maxscore == minscore) {
    return rmin;
  }
  r = d3.scale.linear()
   .domain([minscore, maxscore])
   .range([rmin, rmax])
  return r(d.S);
}

// calculates the mouseover radius of a datum
function getrbig(d) {
  return getr(d) + 2;
}

// key function for d3 data binding
function wordtext(d) {
  return d.W;
}

function reweight(v, changed) {
  var w = weights.split("/");
  w[changed] = String(v / 10.0);
  weights = w.join("/");
  d3.json("/data/reweight/" + currYear + "/" + weights, function(json) {fetchData(num_datums);});
}

function fetchData(ndatums) {
  d3.json("/data/" + 0 + "/" + ndatums, function(json) {updateViz(json);});
}

function makeScales() {
  // additional offsets making space for axis text labels
  var leftOffset = 40
  var bottomOffset = 40

  //padding around the graphing space
  var pad = new Object()
  pad.left = 15 + leftOffset
  pad.right = 15
  pad.top = 15
  pad.bottom = 15 + bottomOffset

  // calc max/min and calibrate axis scales
  var bkmin = 40
  var bkmax = 150000
  var dmin = 1
  var dmax = 30

  // create 
  s = new Object();
  s.x = d3.scale.log()
   .domain([dmin, dmax])
   .range([pad.left, vizw-pad.right])
  s.y = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([vizh-pad.bottom, pad.top])

  return s;
}

function updateViz(data) {
  // time len (ms) of animated transitions
  var transdur = 1000

  scales = makeScales()

  var viz = d3.select("#viz").select("svg")
  var tooltip = d3.select("#tooltip")

  // min and max scores used to make relative encodings
  minscore = d3.min(data, function(d) {return d.S})
  maxscore = d3.max(data, function(d) {return d.S})

  var circle = viz.selectAll("circle")

  // create color scale based on something ????????????????????
  gbscale = d3.scale.linear().domain([minscore, maxscore]).range([255, 0])

  // update existing circles to updated scales
  circle.data(data, wordtext)
    .transition()
    .duration(transdur)
    .delay(function(i, d) {return i * 10;})
    .attr("cx", function(d, i) {return scales.x(d.X);})
    .attr("cy", function(d, i) {return scales.y(d.Y);})
    .style("fill", function(d) {return d3.rgb(255, gbscale(d.S), gbscale(d.S)).toString();})
    .attr("r", function(d) {return getr(d, minscore, maxscore);});

  // add new circles
  circle.data(data, wordtext)
    .enter().append("svg:circle")
    .attr("r", 0)
    .attr("cx", function(d, i) {return scales.x(d.X);})
    .attr("cy", function(d, i) {return scales.y(d.Y);})
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

// main execution start point:
initTooltip();
initVizCanvas();
initAxes();
reweight();

