/////// adjustable params /////////

// plot canvas dimensions
var vizh = 600;
var vizw = 900;

// radii for datum circles
var rmin = 3
var rmax = 10

// freq of auto rerendering
var renderFreq = 800

// time len (ms) of animated transitions
var transdur = 1000
var stagger  = 2 * transdur

// slider widths
var doiSliderWidth = 100
var yearSliderWidth = 500
var numDatumsSliderWidth = 500

/////// end adjustable params /////////

var doUpdate = true;
var mouseIsDown = false;

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
  state.zoom = []
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
  function drawZoomRect(lev) {
    var cornerLeft = d3.min([lev.x1, lev.x2])
    var cornerTop = d3.min([lev.y1, lev.y2])

    d3.select("#viz").select("svg").selectAll("#zoomrect")
      .data([0])
        .attr("x", cornerLeft)
        .attr("y", cornerTop)
        .attr("width", Math.abs(lev.x1 - lev.x2))
        .attr("height", Math.abs(lev.y1 - lev.y2))
        

    d3.select("#viz").select("svg").selectAll("#zoomrect")
      .data([0]).enter().append("svg:rect")
        .attr("id", "zoomrect")
        .attr("x", cornerLeft)
        .attr("y", cornerTop)
        .attr("width", Math.abs(lev.x1 - lev.x2))
        .attr("height", Math.abs(lev.y1 - lev.y2))
        .style("fill", "black")
        .style("fill-opacity", 0.4)
  }

  d3.select("#viz").append("svg:svg")
    .attr("width", vizw)
    .attr("height", vizh)
    .on("mousedown", function(d) {
        event.preventDefault()
        mouseIsDown = true
        pos = d3.mouse(this)
        var lev = new Object()
        lev.x1 = pos[0]
        lev.y1 = pos[1]
        lev.x2 = pos[0]
        lev.y2 = pos[1]
        state.zoom.push(lev)

        drawZoomRect(lev)
      })
    .on("mouseup", function(d) {
        if (!mouseIsDown) {
          return;
        }

        // get min/max of x and y and rescale/replot
        mouseIsDown = false
        pos = d3.mouse(this)
        var lev = state.zoom[state.zoom.length - 1]
        lev.x2 = pos[0]
        lev.y2 = pos[1]

        // check for/ignore too small zoom box
        var thresh = 10
        var xmin = d3.min([lev.x1, lev.x2])
        var ymin = d3.min([lev.y1, lev.y2])
        var xmax = d3.max([lev.x1, lev.x2])
        var ymax = d3.max([lev.y1, lev.y2])
        if (xmax - xmin < thresh || ymax - ymin < thresh) {
          state.zoom.pop();
          return;
        }

        // update plot with no stagger and longer dur than normal
        var tmpStagger = stagger;
        var tmpDur = transdur;
        stagger = 0;
        transdur = 2 * transdur
        updatePlot();

        updateScales(state.x.invert(xmin), state.x.invert(xmax),
          state.y.invert(ymax), state.y.invert(ymin));

        var width = state.x.range()[1] - state.x.range()[0]
        var height = state.y.range()[0] - state.y.range()[1]

        // animate the box to full plot area and make it disappear
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

        // restore original timing
        stagger = tmpStagger;
        transdur = tmpDur;
      })
    .on("mousemove", function(d) {
        if (!mouseIsDown) {
          return;
        }
        pos = d3.mouse(this)
        var lev = state.zoom[state.zoom.length - 1]
        lev.x2 = pos[0]
        lev.y2 = pos[1]

        drawZoomRect(lev)
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

function initDOItitle() {
  var vizTitle = d3.select("#doiTitle")
    .attr("style", "text-align:center; font-size:150%; text-decoration:underline;")
    .text("Degree of Interest");
}

function initDOIsliders() {
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

function initDOIlegend() {
  var circleBuffer = 15;
  var circleX = doiSliderWidth / 2;

  var doiLegend = d3.select("#doiLegend");
  
  doiLegend.attr("style", "text-align:center;")
  doiLegend.html("<strong>Legend</strong>");
  
  var doiLegendSVG = doiLegend.append("svg:svg");
  
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
    .style("fill","red");
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
    .attr("style","width:" + vizw + "px; text-align:center");
  numDatumsSlider.append("div")
    .attr("id","numDatumsLabel")
    .text("Datapoints displayed: " + state.numDatums)
    .attr("style","font-size:200%;");
  numDatumsSlider.append("input")
    .attr("name","numDatums")
    .attr("type","range")
    .attr("min", 0)
    .attr("max", 1000)
    .attr("value", state.numDatums)
    .attr("style", "width:" + numDatumsSliderWidth + "px;")
    .on("change", function(d) {return changeNumDatums(this.value);});
}

function updateAxes() {
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
    numDatumsSlider.select("#numDatumsLabel").text("Datapoints displayed: " + state.numDatums);
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
  var viz = d3.select("#viz").select("svg")
  var tooltip = d3.select("#tooltip")

  var circle = viz.selectAll("circle")

  // create color scale based on something ????????????????????
  state.gbscale = d3.scale.linear().domain([state.minscore, state.maxscore]).range([255, 0])

  // update existing circles to updated scales
  circle.data(state.data, wordtext)
    .transition()
    .duration(transdur)
    .delay(function(d, i) {return i / state.data.length * stagger;})
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
initNumDatumsSlider();
initDOItitle();
initDOIsliders();
initDOIlegend();

// update/rerender the vis once per second at the most
setInterval(function() {
  if (doUpdate) {
    doUpdate = false;
    updateViz();
  }
}, renderFreq);

