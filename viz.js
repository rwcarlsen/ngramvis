/////// adjustable params /////////

// plot canvas dimensions
var vizh = 600;
var vizw = 900;
var maxPoints = 2000;

// radii for datum circles
var rmin = 4
var rmax = 11

// freq of auto rerendering
var renderFreq = 800

// time len (ms) of animated transitions
var transdur = 1000
var stagger  = 2 * transdur

// slider widths
var doiSliderWidth = 100
var yearSliderWidth = 500
var numDatumsSliderWidth = 500
var doiLegendWidth = 100
var doiLegendHeight = 100

/////// end adjustable params /////////

var doUpdate = true;
var mouseIsDown = false;

function createAxesVar(index, id, displayName, zoomMin, zoomMax, explanation) {
  var tmp = new Object();
  tmp.index = index;
  tmp.id = id;
  tmp.displayName = displayName;
  tmp.zoomMin = zoomMin;
  tmp.zoomMax = zoomMax;
  tmp.explanation = explanation;
  return tmp;
}

var axesVars = new Object();
axesVars["wlen"] = createAxesVar(0, "wlen", "Word Length", 1, 20,
                                 "The number of charactes in a word.");
axesVars["cnt"] = createAxesVar(1, "cnt", "Count", 1, 1000000000,
                                 "The number of times a word appeared in the books from a given year.");
axesVars["pgs"] = createAxesVar(2, "pgs", "# Pages", 1, 20,
                                 "The number of pages on which a word appeared in a given year.");
axesVars["bks"] = createAxesVar(3, "bks", "# Books", 1, 100000,
                                 "The number of books in which a word appeared in a given year.");
axesVars["pden"] = createAxesVar(4, "pden", "Page Density", 1, 30,
                                 "The number of times a word occurred per page on which it occurred.");
axesVars["tmp"] = createAxesVar(5, "tmp", "Temperature", .0001, 1,
                                 "Temperature measures how close a word is to its all-time high or low in count.");

var state = new Object()

// used to prevent recomputation and facilitate access from mouseovers etc.
function initState() {
  state.currYear = 1980
  state.numDatums = 500 // num words to retrieve from server
  state.minscore = 0
  state.maxscore = 0
  state.minparam = 0
  state.maxparam = 0
  state.gbscale = null
  state.data = null // holds the retrieved data
  state.x = null // holds the x axis scale func
  state.y = null // holds the y axis scale func
  state.zoom = []
  state.zoomBox = null
  state.weights = "0/0/0/0/0/0"

  // axis/param variables
  // choices so far are pden, tmp, bks, cnt, wlen
  state.xvar = "pden"
  state.yvar = "tmp"
  state.paramvar = "tmp"
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
  d3.select("#viz").append("svg:svg")
    .attr("width", vizw)
    .attr("height", vizh)
    .on("contextmenu", function(d) {
        event.preventDefault()
        popZoomLevel()
      })
    .on("mousedown", function(d) {
        event.preventDefault()
        if (isRightClick(event)) {
          return
        }
        mouseIsDown = true
        pos = d3.mouse(this)
        state.zoomBox = new Object()
        state.zoomBox.x1 = pos[0]
        state.zoomBox.y1 = pos[1]
        state.zoomBox.x2 = pos[0]
        state.zoomBox.y2 = pos[1]

        drawZoomRect()
      })
    .on("mouseup", function(d) {
        if (!mouseIsDown) {
          return;
        }
        if (isRightClick(event)) {
          return
        }

        // get min/max of x and y and rescale/replot
        mouseIsDown = false
        pos = d3.mouse(this)
        state.zoomBox.x2 = pos[0]
        state.zoomBox.y2 = pos[1]

        // check for/ignore too small zoom box
        var thresh = 10
        var xmin = d3.min([state.zoomBox.x1, state.zoomBox.x2])
        var xmax = d3.max([state.zoomBox.x1, state.zoomBox.x2])
        var ymin = d3.min([state.zoomBox.y1, state.zoomBox.y2])
        var ymax = d3.max([state.zoomBox.y1, state.zoomBox.y2])
        if (xmax - xmin < thresh || ymax - ymin < thresh) {
          return;
        }

        appendZoomLevel(state.x.invert(xmin), state.x.invert(xmax), state.y.invert(ymax), state.y.invert(ymin));
        renderNewZoom()
      })
    .on("mousemove", function(d) {
        if (!mouseIsDown) {
          return;
        }
        pos = d3.mouse(this)
        state.zoomBox.x2 = pos[0]
        state.zoomBox.y2 = pos[1]

        drawZoomRect()
      })
}

function initScales() {
  appendZoomLevel(axesVars[state.xvar].zoomMin, axesVars[state.xvar].zoomMax,
                  axesVars[state.yvar].zoomMin, axesVars[state.yvar].zoomMax);
  renderAxes();
}

function initTitle() {
  var vizTitle = d3.select("#vizTitle")
    .attr("class", "vizTitle")
    .attr("style", "width:" + vizw + "px;")
    //.attr("style", "width:" + vizw + "px; text-align:center; font-size:300%;")
    .text(axesVars[state.yvar].displayName + " vs. " + axesVars[state.xvar].displayName);
}

function initDOItitle() {
  var doiTitle = d3.select("#doiTitle")
    .attr("class", "bigLabel")
    //.attr("style", "text-align:center; font-size:150%; text-decoration:underline;")
    .text("Degree of Interest");
}

function initDOIsliders() {
  var doiSliders = d3.select("#doiSliders");

  var addDOIslider = function(idName, displayName, tooltip, i) {
    doiSliders.append("input")
        .attr("name", idName)
        .attr("type", "range")
        .attr("min", -10)
        .attr("max", 10)
        .attr("value", 0)
        .attr("class","doiSlider")
        //.attr("style", "width:" + doiSliderWidth + "px; vertical-align:middle")
        .on("change", function(d) {return reweight(this.value,i);});
    doiSliders.append("sliderLabel")
        .attr("class", "smallLabel")
        .text(" " + displayName)
        .attr("title", tooltip);
    doiSliders.append("br");
  }
  
  for(var index in axesVars) {
    var axesVar = axesVars[index];
    addDOIslider(axesVar.id, axesVar.displayName, axesVar.explanation, axesVar.index);
  }
}

function initDOIlegend() {
  var circleBuffer = 15;
  var circleX = doiSliderWidth / 2;

  var doiLegend = d3.select("#doiLegend");
  
  doiLegend.attr("class", "doiLegend")
  //doiLegend.html("<strong>Legend</strong>");
  
  var doiLegendSVG = doiLegend.append("svg:svg")
    //.attr("width", 200)
    .attr("height", 100);
  
  // Little circle
  doiLegendSVG.append("svg:circle")
    .attr("r", rmin)
    .attr("cx", circleX)
    .attr("cy", rmax + circleBuffer)
    .style("stroke","black")
    .style("fill","white");
  doiLegendSVG.append("svg:text")
    .attr("x", circleX + rmax + circleBuffer)
    .attr("y", rmax + circleBuffer)
    .attr("dominant-baseline","central")
    .text("Minimum DOI");
    
  // Big circle
  doiLegendSVG.append("svg:circle")
    .attr("r", rmax)
    .attr("cx", circleX)
    .attr("cy", 2*rmax + 2*circleBuffer)
    .style("stroke","black")
    .style("fill","white");
  doiLegendSVG.append("svg:text")
    .attr("x", circleX + rmax + circleBuffer)
    .attr("y", 2*rmax + 2*circleBuffer)
    .attr("dominant-baseline","central")
    .text("Maximum DOI");
}

function initYearSlider() {
  var yearSlider = d3.select("#yearSlider")
    .attr("style","width:" + vizw + "px; text-align:center");
  yearSlider.append("div")
    .attr("id","yearLabel")
    .text("Year: " + state.currYear)
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

function initNumDatumsSlider() {
  var numDatumsSlider = d3.select("#numDatumsSlider")
    //.attr("style","width:" + vizw + "px; text-align:center");
  numDatumsSlider.append("div")
    .attr("id","numDatumsLabel")
    .text("Words displayed: " + state.numDatums)
    //.attr("style","font-size:200%;");
    .attr("class","bigLabel")
  numDatumsSlider.append("input")
    .attr("name","numDatums")
    .attr("type","range")
    .attr("min", 0)
    .attr("max", maxPoints)
    .attr("value", state.numDatums)
    //.attr("style", "width:" + numDatumsSliderWidth + "px;")
    .attr("class","numDatumsSlider")
    .on("change", function(d) {return changeNumDatums(this.value);});
}

function initXYDropdowns() {
  var xyDropdowns = d3.select("#xyDropdowns")
  xyDropdowns.append("dropdownLabel")
    .attr("class", "smallLabel")
    .text("X Axis: ");
  var xDropdown = xyDropdowns.append("select")
    .attr("name","xDropdown");
  xyDropdowns.append("br");
  xyDropdowns.append("dropdownLabel")
    .attr("class", "smallLabel")
    .text("Y Axis: ");
  var yDropdown = xyDropdowns.append("select")
    .attr("name","yDropdown");
    
  for(var i in axesVars) {
    axesVar = axesVars[i];
    var x = xDropdown.append("option")
      .text(axesVar.displayName)
      .attr("id",axesVar.id);
    if(axesVar.id == state.xvar) {
      x.attr("selected","selected");
    }
    var y = yDropdown.append("option")
      .text(axesVar.displayName)
      .attr("id",axesVar.id);
    if(axesVar.id == state.yvar) {
      y.attr("selected","selected");
    }
  }
  
  xDropdown.on("change", function(d) {return changeXaxis(this.options[this.selectedIndex].id);});
  yDropdown.on("change", function(d) {return changeYaxis(this.options[this.selectedIndex].id);});
}

function isRightClick(e) {
  var rightclick;
  if (!e) var e = window.event;
  if (e.which) rightclick = (e.which == 3);
  else if (e.button) rightclick = (e.button == 2);
  return rightclick
}

function renderNewZoom(reverse) {
  if (state.zoom.length == 0) {
    return
  }
  drawZoomRect()

  // update plot with no stagger and longer dur than normal
  var tmpStagger = stagger;
  var tmpDur = transdur;
  stagger = 0;
  transdur = 2 * transdur

  renderAxes();
  renderPlot();

  var width = state.x.range()[1] - state.x.range()[0]
  var height = state.y.range()[0] - state.y.range()[1]
  var cornerLeft = d3.min([state.zoomBox.x1, state.zoomBox.x2])
  var cornerTop = d3.min([state.zoomBox.y1, state.zoomBox.y2])

  // animate the box to full plot area and make it disappear
  if (reverse) {
    d3.select("#viz").select("svg")
      .select("#zoomrect")
        .style("fill-opacity", 0.0)
        .attr("x", state.x.range()[0])
        .attr("y", state.y.range()[1])
        .attr("width", width)
        .attr("height", height)
        .transition()
        .duration(transdur)
        .attr("x", cornerLeft)
        .attr("y", cornerTop)
        .attr("width", Math.abs(state.zoomBox.x1 - state.zoomBox.x2))
        .attr("height", Math.abs(state.zoomBox.y1 - state.zoomBox.y2))
        .style("fill-opacity", 0.4)
        .transition()
        .remove()
  } else {
    d3.select("#viz").select("svg")
      .select("#zoomrect")
        .transition()
        .duration(transdur)
        .attr("x", state.x.range()[0])
        .attr("y", state.y.range()[1])
        .attr("width", width)
        .attr("height", height)
        .style("fill-opacity", 0.0)
        .transition()
        .remove()
  }

  // restore original timing
  stagger = tmpStagger;
  transdur = tmpDur;
}

function popZoomLevel() {
  if (state.zoom.length <= 1) {
    return
  }

  state.zoomBox = state.zoom[state.zoom.length - 1].box

  state.zoom.pop()
  var lev = state.zoom[state.zoom.length - 1]
  state.x = lev.x
  state.y = lev.y
  renderNewZoom(true)
}

function appendZoomLevel(xmin, xmax, ymin, ymax) {
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

   var lev = new Object()
   lev.x = state.x
   lev.y = state.y
   lev.box = state.zoomBox
   state.zoom.push(lev)
}

function drawZoomRect() {
  var cornerLeft = d3.min([state.zoomBox.x1, state.zoomBox.x2])
  var cornerTop = d3.min([state.zoomBox.y1, state.zoomBox.y2])

  d3.select("#viz").select("svg").selectAll("#zoomrect")
    .data([0])
      .attr("x", cornerLeft)
      .attr("y", cornerTop)
      .attr("width", Math.abs(state.zoomBox.x1 - state.zoomBox.x2))
      .attr("height", Math.abs(state.zoomBox.y1 - state.zoomBox.y2))

  d3.select("#viz").select("svg").selectAll("#zoomrect")
    .data([0]).enter().append("svg:rect")
      .attr("id", "zoomrect")
      .attr("x", cornerLeft)
      .attr("y", cornerTop)
      .attr("width", Math.abs(state.zoomBox.x1 - state.zoomBox.x2))
      .attr("height", Math.abs(state.zoomBox.y1 - state.zoomBox.y2))
      .style("fill", "black")
      .style("fill-opacity", 0.4)
}

function renderAxes() {
  var axisColor = "black"
  var tickColor = "black"

  var majorTick = 20
  var minorTick = 10
  var width = 3

  var dur = transdur

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

  // used to maintain continuity between different scale transitions
  function tickKey(d) {return d;}

  ///// tick mark labels ///////

  // x labels
  viz.selectAll(".xLabel")
    .data(state.x.ticks(), tickKey)
    .transition()
    .duration(dur)
    .attr("x", function(d) {return state.x(d);})
    .attr("transform", function(d) {
        return "rotate(-70 " + state.x(d) + " " + (state.y.range()[0] + 40) + ")";
      })
  viz.selectAll(".xLabel")
    .data(state.x.ticks(), tickKey)
    .enter().append("svg:text")
    .attr("class","xLabel")
    .text(state.x.tickFormat())
    .attr("x", function(d) {return state.x(d);})
    .attr("y", state.y.range()[0] + 40)
    .attr("text-anchor", "middle")
    .attr("transform", function(d) {
        return "rotate(-70 " + state.x(d) + " " + (state.y.range()[0] + 40) + ")";
    })
    .style("fill-opacity", 0)
    .transition()
    .delay(transdur)
    .style("fill-opacity", 1)
  viz.selectAll(".xLabel")
    .data(state.x.ticks(), tickKey)
    .exit()
    .remove()

  var yTicksInRange = 0
  var yticks = state.y.ticks()
  for (i in yticks) {
    if (yticks[i] < state.y.domain()[1] && yticks[i] > state.y.domain()[0]) {
      yTicksInRange += 1
    }
  }

  // y labels
  viz.selectAll(".yLabel")
    .data(state.y.ticks(), tickKey)
    .transition()
    .duration(dur)
    .attr("y", function(d) {return state.y(d);})
  viz.selectAll(".yLabel")
    .data(state.y.ticks(), tickKey)
    .enter().append("svg:text")
    .attr("class","yLabel")
    .text( function(d) {
        var first = parseInt(String(d)[0])
        if (yTicksInRange < 18) {
          return state.y.tickFormat()(d);
        } else {
          if (first <= 4 || first == 6) {
            return state.y.tickFormat()(d);
          }
        }
        return "";
      })
    .attr("x", state.x.range()[0])
    .attr("y", function(d) {return state.y(d);})
    .attr("text-anchor", "end")
    .attr("transform", "translate(-15 4)")
    .style("fill-opacity", 0)
    .transition()
    .delay(transdur)
    .style("fill-opacity", 1)
  viz.selectAll(".yLabel")
    .data(state.y.ticks(), tickKey)
    .exit().remove()

  // x tick marks
  viz.selectAll(".xTicks")
    .data(state.x.ticks(), tickKey)
    .transition()
    .duration(dur)
    .attr("x1", function(d) {return state.x(d);})
    .attr("y1", xTickEndsFunc(-1))
    .attr("x2", function(d) {return state.x(d);})
    .attr("y2", xTickEndsFunc(1))
    .attr("stroke-width", tickW)
  viz.selectAll(".xTicks")
    .data(state.x.ticks(), tickKey)
    .enter().append("svg:line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {return state.x(d);})
    .attr("y1", xTickEndsFunc(-1))
    .attr("x2", function(d) {return state.x(d);})
    .attr("y2", xTickEndsFunc(1))
    .attr("stroke", tickColor)
    .attr("stroke-width", tickW)
    .style("stroke-opacity", 0)
    .transition()
    .delay(transdur)
    .style("stroke-opacity", 1)
  viz.selectAll(".xTicks")
    .data(state.x.ticks(), tickKey)
    .exit().remove()
    
  // y tick marks
  viz.selectAll(".yTicks")
    .data(state.y.ticks(), tickKey)
    .transition()
    .duration(dur)
    .attr("y1", function(d) {return state.y(d);})
    .attr("x1", yTickEndsFunc(-1))
    .attr("y2", function(d) {return state.y(d);})
    .attr("x2", yTickEndsFunc(1))
    .attr("stroke-width", tickW)
  viz.selectAll(".yTicks")
    .data(state.y.ticks(), tickKey)
    .enter().append("svg:line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {return state.y(d);})
    .attr("x1", yTickEndsFunc(-1))
    .attr("y2", function(d) {return state.y(d);})
    .attr("x2", yTickEndsFunc(1))
    .attr("stroke", tickColor)
    .attr("stroke-width", tickW)
    .style("stroke-opacity", 0)
    .transition()
    .delay(transdur)
    .style("stroke-opacity", 1)
  viz.selectAll(".yTicks")
    .data(state.y.ticks(), tickKey)
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
  var yearSlider = d3.select("#yearSlider");
  yearSlider.select("#yearLabel").text("Year: " + state.currYear);
  doUpdate = true;
}

function changeNumDatums(newNum) {
    state.numDatums = newNum;
    var numDatumsSlider = d3.select("#numDatumsSlider");
    numDatumsSlider.select("#numDatumsLabel").text("Words displayed: " + state.numDatums);
    doUpdate = true;
}

function changeXaxis(newX) {
    state.xvar = newX;
    resetAxes();
    doUpdate = true;
}

function changeYaxis(newY) {
    state.yvar = newY;
    resetAxes();
    doUpdate = true;
}

function resetAxes() {
    state.zoom = [];
    state.zoomBox = null;
    initScales();
    initTitle();
}

// recalcs scores based on weights and initiates data retrieval
function updateViz() {
  d3.json("/data/reweight/" + state.currYear + "/" + state.weights, function(json) {fetchData(state.numDatums);});
}

// retrieves data and initiates rendering.
function fetchData(ndatums) {
  d3.json("/data/" + state.xvar + "/" + state.yvar + "/" + state.paramvar
           + "/" + 0 + "/" + ndatums, function(json) {
      state.data = json;

      // min and max scores used to make relative encodings
      state.minscore = d3.min(state.data, function(d) {return d.S})
      state.maxscore = d3.max(state.data, function(d) {return d.S})

      state.minparam = d3.min(state.data, function(d) {return d.P})
      state.maxparam = d3.max(state.data, function(d) {return d.P})

      renderPlot();
    });
}

function renderPlot() {
  var viz = d3.select("#viz").select("svg")
  var tooltip = d3.select("#tooltip")

  var circle = viz.selectAll("circle")

  // create color scale based on param (temperature)
  state.gbscale = d3.scale.linear().domain([state.minparam, state.maxparam]).range([255, 0])

  // update existing circles to updated scales
  circle.data(state.data, wordtext)
    .transition()
    .duration(transdur)
    .delay(function(d, i) {return i / state.data.length * stagger;})
    .attr("cx", function(d, i) {return state.x(d.X);})
    .attr("cy", function(d, i) {return state.y(d.Y);})
    .style("fill", function(d) {return d3.rgb(255, state.gbscale(d.P), state.gbscale(d.P)).toString();})
    .attr("r", function(d) {
        if (state.x(d.X) < state.x.range()[0] + rmax || state.y(d.Y) > state.y.range()[0] - rmax) {
          return 0;
        }
        return getr(d);
      });

  // add new circles
  circle.data(state.data, wordtext)
    .enter().append("svg:circle")
    .attr("r", 0)
    .attr("cx", function(d, i) {return state.x(d.X);})
    .attr("cy", function(d, i) {return state.y(d.Y);})
    .style("stroke", "black")
    .style("fill", function(d) {return d3.rgb(255, state.gbscale(d.P), state.gbscale(d.P)).toString();})
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
          .style("fill", function() {return d3.rgb(255, state.gbscale(d.P), state.gbscale(d.P)).toString();});
        return tooltip.style("visibility", "hidden");
      })
    .transition()
    .duration(transdur)
    .attr("r", function(d) {
        if (state.x(d.X) < state.x.range()[0] + rmax || state.y(d.Y) > state.y.range()[0] - rmax) {
          return 0;
        }
        return getr(d);
      });

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
initNumDatumsSlider();
initDOItitle();
initDOIsliders();
initDOIlegend();
initXYDropdowns();

// update/rerender the vis once per second at the most
setInterval(function() {
  if (doUpdate) {
    doUpdate = false;
    updateViz();
  }
}, renderFreq);

