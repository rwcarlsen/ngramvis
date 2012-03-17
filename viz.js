// global variables
var h = 750; //height
var w = 1200; //width
var r = 3; //radius - IS THIS EVER USED?
var rbig = 8; //max radius size - JUST SEEMS TO BE USED TO DEFINE PAD
var pad = rbig + 10 //padding around the graphing space
var xOffset = 40
var yOffset = 40
//var pad = 300

var data = [];
var num_datums = 500;
var chunk_size = 100; //
var disp_year = "2005"

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

/*var tmpData = [1,2,3,4,5]
var testh = 200
var testw = 500
var x = d3.scale.linear().domain([0, tmpData.length - 1]).range [0, testw]
var y = d3.scale.linear().domain([0, d3.max(tmpData)]).range [testh, 0]

var testVis = d3.select("#test")
  .append("svg:svg")
  .attr("width",testw)
  .attr("height",testh);

testVis.append("svg:rect")
  .attr("x",50)
  .attr("y",50)
  .attr("height",50)
  .attr("width",50);
  
viz.append("svg:line")
  .attr("x1",25)
  .attr("y1",25)
  .attr("x2",150)
  .attr("y2",25)
  .attr("stroke","red");*/

//viz.selectAll('path.line')
//testVis.selectAll('path.line')
//    .data(tmpData)
//  .enter().append("svg:path")
//    .attr("d", d3.svg.line()
//      .x((d,i) -> x(i))
//      .y(y))

// load external word data - note asynchrous behavior (parallel requests)
for (i = 0; i < num_datums; i += chunk_size) {
  if (i > num_datums) {i = num_datums;}
  d3.json("/data/" + i + "/" + chunk_size, function(json) {renderVis(json);});
}

// This function calculates page-density
function pd(entry) {
  if (entry.P == 0) {return 0;}
  return entry.W / entry.P;
}

function renderVis(newdata) {
  var dd;
  for (var i in newdata) {
    dd = new Object();
    if (newdata[i].C[disp_year] == undefined) {
      continue;
    }
    dd.W = newdata[i].T; // word text
    dd.Y = newdata[i].C[disp_year].B; // y-coordinate: book count
    dd.X = pd(newdata[i].C[disp_year]); // x-coordinate: page density
    dd.r = Math.sqrt(4 * newdata[i].T.length); // radius - proportional to word length
    dd.rbig = Math.sqrt(8 * newdata[i].T.length); // mouseover radius
    dd.C = newdata[i].C[disp_year].W; // word count
    data.push(dd);
  }

  // calc max/min and calibrate axis scales
  bkmin = 1;
  bkmax = d3.max(data, function(d) {return d.Y;})

  dmin = 1;
  dmax = d3.max(data, function(d) {return d.X;})

  var xscale = d3.scale.log()
   .domain([dmin, dmax])
   .range([0+xOffset+pad, w-pad])
  var yscale = d3.scale.log()
   .domain([bkmin, bkmax])
   .range([h-yOffset-pad, 0+pad])
   
  var axis = viz.selectAll("line")
  
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
    //.attr("x2",function(d) {return xscale(d);})
    //.attr("y2",function(d) {return yscale(d);})
    
  /*axis.data([100,200,300,400])
    .enter().append("svg:line")
    .attr("x1",xscale(0))
    .attr("y1",yscale(0))
    .attr("x2",function(d) {return xscale(d);})
    .attr("y2",function(d) {return yscale(d);})
    .attr("stroke","red")*/
  
  //viz.append("svg:line")

  //var xaxis = d3.svg.axis()
  //  .scale(xscale)
  //  .orient("bottom")
                
  //var yaxis = d3.svg.axis()
  //  .scale(yscale)
  //  .orient("left")

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
    .attr("r", function(d) {return d.r;})
    .attr("cx", function(d, i) {return xscale(d.X);})
    .attr("cy", function(d, i) {return yscale(d.Y);})
    .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", "blue")
          .attr("r", function() {return d.rbig;});
        return tooltip
          .style("visibility", "visible")
          .style("top", event.pageY+"px").style("left",(event.pageX+15)+"px")
          .text(function() {
            return d.W + " : den=" + String(d.X) + ", #bks=" + String(d.Y)
                       + " \n cnt=" + String(d.C);
          });
    })
    .on("mousemove", function(){
      return tooltip;
    })
    .on("mouseout", function(d){
        d3.select(this)
          .attr("r", function() {return d.r;})
          .style("fill", "black");
        return tooltip.style("visibility", "hidden");
      })

}

