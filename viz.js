/////// adjustable params /////////

// plot canvas dimensions
var vizh = 600;
var vizw = 900;

// radii for datum circles
var rmin = 3
var rmax = 10

// freq of auto rerendering
var renderFreq = 1200

// time len (ms) of animated transitions
var transdur = 1000

/////// end adjustable params /////////

var doUpdate = true;

var state = new Object()

// used to prevent recomputation and facilitate access from mouseovers etc.
function initState() {
  state.currYear = 1980
  state.numDatums = 500 // num words to retrieve from server
  state.minscore = 0
  state.maxscore = 0
  state.gbscale = null
  state.data = null // holds the retrieved data
  state.x = null // holds the x axis scale func
  state.y = null // holds the y axis scale func
  state.zoomPts = null
  state.weights = "0/0/0/0/0"
}

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
    .on("mousedown", function(d) {
        state.zoomPts = new Object()
        state.zoomPts.x = []
        state.zoomPts.y = []
      })
    .on("mouseup", function(d) {
        // get min/max of x and y and rescale/replot
        state.zoomPoints = null
      })
    .on("mousemove", function(d) {
        if (state.zoomPts == null) {return;}
        pos = d3.mouse(this)
        state.zoomPoints.x.append(pos[0])
        state.zoomPoints.y.append(pos[1])
      })
}

function initScales() {
  updateScales(1, 30, 1, 150000)
}

function initTitle() {
  var vizTitle = d3.select("#vizTitle")
    .attr("style", "width:" + vizw + "px; text-align:center; font-size:300%;")
    .text("Books vs. Page Density");
}

function initDOIsliders() {
  // slider dimensions
  var doiSliderWidth = 100;

  var doiSliders = d3.select("#doiSliders");

  var addDOIslider = function(idName, displayName, i) {
    doiSliders.append("input")
        .attr("name", idName)
        .attr("type", "range")
        .attr("min", -10)
        .attr("max", 10)
        .attr("value", 0)
        .attr("style", "width:" + doiSliderWidth + "px; vertical-align:middle")
        .on("change", function(d) {return reweight(this.value,i);});
    doiSliders.append("sliderLabel").text(" " + displayName);
    doiSliders.append("br");
  }

  addDOIslider("wordlength", "Word Length", 0);
  addDOIslider("count", "Count", 1);
  addDOIslider("pages", "# Pages", 2);
  addDOIslider("books", "# Books", 3);
  addDOIslider("pd", "Page Density", 4);
}

function initYearSlider() {
  // slider dimensions
  var yearSliderWidth = 500;

  var yearSlider = d3.select("#yearSlider")
    .attr("style","width:" + vizw + "px; text-align:center");
  yearSlider.append("div")
    .attr("id","yearLabel")
    .text(state.currYear)
    .attr("style","font-size:200%;");
  yearSlider.append("input")
    .attr("name","time")
    .attr("type","range")
    .attr("min", 1700)
    .attr("max", 2008)
    .attr("value", state.currYear)
    .attr("style", "width:" + yearSliderWidth + "px;")
    .on("change", function(d) {return changeYear(this.value);});
}

function updateAxes() {
  var axisColor = "black"
  var tickColor = "black"

  var majorTick = 20
  var minorTick = 10
  var width = 3

  var dur = 2 * transdur

  // tickwidth func for y axis
  tickW = function(d) {
    if (String(d)[0] == "1") {
      return 5
    }
    return 1;
  }

  // generates tick end point generating functions
  var yTickEndsFunc = function(sign) {
    var mult = -1
    if (sign > 0) {mult = 1;}
    return function(d) {
      if (String(d)[0] == "1") {
        return state.x.range()[0] + mult * majorTick / 2.0;
      }
      return state.x.range()[0] + mult * minorTick / 2.0;
    };
  }
  var xTickEndsFunc = function(sign) {
    var mult = -1
    if (sign > 0) {mult = 1;}
    return function(d) {
      if (String(d)[0] == "1") {
        return state.y.range()[0] + mult * majorTick / 2.0;
      }
      return state.y.range()[0] + mult * minorTick / 2.0;
    };
  }
    
  var viz = d3.select("#viz").select("svg")

  var xr = state.x.range()
  var yr = state.y.range()
  var axes = [[xr[0], yr[0], xr[1], yr[0]],
              [xr[0], yr[0], xr[0], yr[1]]]

  // axis lines
  viz.selectAll("#axisline").data(axes).enter().append("svg:line")
    .attr("id", "axisline")
    .attr("x1", function(d) {return d[0];})
    .attr("y1", function(d) {return d[1];})
    .attr("x2", function(d) {return d[2];})
    .attr("y2", function(d) {return d[3];})
    .attr("stroke", axisColor)
    .attr("stroke-width", width)

  ///// tick mark labels ///////

  // x labels
  viz.selectAll(".xLabel")
    .data(state.x.ticks())
    .transition()
    .duration(dur)
    .attr("x", function(d) {return state.x(d);})
    .attr("transform", function(d) {
        return "rotate(-70 " + state.x(d) + " " + (state.y.range()[0] + 40) + ")";
      })
  viz.selectAll(".xLabel")
    .data(state.x.ticks())
    .enter().append("svg:text")
    .attr("class","xLabel")
    .text(state.x.tickFormat())
    .attr("x", function(d) {return state.x(d);})
    .attr("y", state.y.range()[0] + 40)
    .attr("text-anchor", "middle")
    .attr("transform", function(d) {
        return "rotate(-70 " + state.x(d) + " " + (state.y.range()[0] + 40) + ")";
      })
  viz.selectAll(".xLabel")
    .data(state.x.ticks())
    .exit()
    .remove()

  // y labels
  viz.selectAll(".yLabel")
    .data(state.y.ticks())
    .transition()
    .duration(dur)
    .attr("y", function(d) {return state.y(d);})
  viz.selectAll(".yLabel")
    .data(state.y.ticks())
    .enter().append("svg:text")
    .attr("class","yLabel")
    .text( function(d) {
        if (String(d)[0] == "1") {
          return state.y.tickFormat()(d);
        }
        return "";
      })
    .attr("x", state.x.range()[0])
    .attr("y", function(d) {return state.y(d);})
    .attr("text-anchor", "end")
    .attr("transform", "translate(-15 4)")
  viz.selectAll(".yLabel")
    .data(state.y.ticks())
    .exit().remove()

  // x tick marks
  viz.selectAll(".xTicks")
    .data(state.x.ticks())
    .transition()
    .duration(dur)
    .attr("x1", function(d) {return state.x(d);})
    .attr("y1", xTickEndsFunc(-1))
    .attr("x2", function(d) {return state.x(d);})
    .attr("y2", xTickEndsFunc(1))
    .attr("stroke-width", tickW)
  viz.selectAll(".xTicks")
    .data(state.x.ticks())
    .enter().append("svg:line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {return state.x(d);})
    .attr("y1", xTickEndsFunc(-1))
    .attr("x2", function(d) {return state.x(d);})
    .attr("y2", xTickEndsFunc(1))
    .attr("stroke", tickColor)
    .attr("stroke-width", tickW)
  viz.selectAll(".xTicks")
    .data(state.x.ticks())
    .exit().remove()
    
  // y tick marks
  viz.selectAll(".yTicks")
    .data(state.y.ticks())
    .transition()
    .duration(dur)
    .attr("y1", function(d) {return state.y(d);})
    .attr("x1", yTickEndsFunc(-1))
    .attr("y2", function(d) {return state.y(d);})
    .attr("x2", yTickEndsFunc(1))
    .attr("stroke-width", tickW)
  viz.selectAll(".yTicks")
    .data(state.y.ticks())
    .enter().append("svg:line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {return state.y(d);})
    .attr("x1", yTickEndsFunc(-1))
    .attr("y2", function(d) {return state.y(d);})
    .attr("x2", yTickEndsFunc(1))
    .attr("stroke", tickColor)
    .attr("stroke-width", tickW)
  viz.selectAll(".yTicks")
    .data(state.y.ticks())
    .exit().remove()
}

// calculates the radius of a datum
function getr(d) {
  if (state.maxscore == state.minscore) {
    return rmin;
  }
  r = d3.scale.linear()
   .domain([state.minscore, state.maxscore])
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

// Function used by weight sliders when changed
function reweight(v, changed) {
  var w = state.weights.split("/");
  w[changed] = String(v / 10.0);
  state.weights = w.join("/");
  doUpdate = true;
}

// Function used by year slider when changed
function changeYear(newYear) {
  state.currYear = newYear;
  var yearSlider = d3.select("#yearSlider")
  yearSlider.select("#yearLabel").text(state.currYear);
  doUpdate = true;
}

// recalcs scores based on weights and initiates data retrieval
function updateViz() {
  d3.json("/data/reweight/" + state.currYear + "/" + state.weights, function(json) {fetchData(state.numDatums);});
}

// retrieves data and initiates rendering.
function fetchData(ndatums) {
  d3.json("/data/" + 0 + "/" + ndatums, function(json) {
      state.data = json;

      // min and max scores used to make relative encodings
      state.minscore = d3.min(state.data, function(d) {return d.S})
      state.maxscore = d3.max(state.data, function(d) {return d.S})

      updatePlot();
    });
}

function updateScales(xmin, xmax, ymin, ymax) {
  // additional offsets making space for axis text labels
  var leftOffset = 40
  var bottomOffset = 40

  //padding around the graphing space
  var pad = new Object()
  pad.left = 15 + leftOffset
  pad.right = 15
  pad.top = 15
  pad.bottom = 15 + bottomOffset

  state.x = d3.scale.log()
   .domain([xmin, xmax])
   .range([pad.left, vizw-pad.right])
  state.y = d3.scale.log()
   .domain([ymin, ymax])
   .range([vizh-pad.bottom, pad.top])

  updateAxes();
}

function updatePlot() {
  // stagger delay between cirlces' animation
  var stagger = 1. / state.data.length * 2 * transdur

  var viz = d3.select("#viz").select("svg")
  var tooltip = d3.select("#tooltip")

  var circle = viz.selectAll("circle")

  // create color scale based on something ????????????????????
  state.gbscale = d3.scale.linear().domain([state.minscore, state.maxscore]).range([255, 0])

  // update existing circles to updated scales
  circle.data(state.data, wordtext)
    .transition()
    .duration(transdur)
    .delay(function(d, i) {return i * stagger;})
    .attr("cx", function(d, i) {return state.x(d.X);})
    .attr("cy", function(d, i) {return state.y(d.Y);})
    .style("fill", function(d) {return d3.rgb(255, state.gbscale(d.S), state.gbscale(d.S)).toString();})
    .attr("r", function(d) {return getr(d);});

  // add new circles
  circle.data(state.data, wordtext)
    .enter().append("svg:circle")
    .attr("r", 0)
    .attr("cx", function(d, i) {return state.x(d.X);})
    .attr("cy", function(d, i) {return state.y(d.Y);})
    .style("stroke", "black")
    .style("fill", function(d) {return d3.rgb(255, state.gbscale(d.S), state.gbscale(d.S)).toString();})
    .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", "blue")
          .attr("r", function() {return getrbig(d);});
        return tooltip
          .style("visibility", "visible")
          .style("top", event.pageY+"px").style("left",(event.pageX+15)+"px")
          .html(function() {
            return "\"" + d.W + "\"<br />den=" + d.X.toFixed(3) + "<br />#bks=" + String(d.Y)
                       + "<br />score=" + d.S.toFixed(3)
          });
    })
    .on("mousemove", function(){
      return tooltip;
    }) .on("mouseout", function(d){ d3.select(this)
          .attr("r", function() {return getr(d);})
          .style("fill", function() {return d3.rgb(255, state.gbscale(d.S), state.gbscale(d.S)).toString();});
        return tooltip.style("visibility", "hidden");
      })
    .transition()
    .duration(transdur)
    .attr("r", function(d) {return getr(d);});

  // remove words that are not longer to be displayed
  circle.data(state.data, wordtext).exit()
    .transition()
    .duration(transdur)
    .attr("r", 0)
    .transition()
    .remove();
}

// main execution start point:

initState();
initTitle();
initTooltip();
initVizCanvas();
initScales();
initYearSlider();
initDOIsliders();

// update/rerender the vis once per second at the most
setInterval(function() {
  if (doUpdate) {
    doUpdate = false;
    updateViz();
  }
}, renderFreq);

