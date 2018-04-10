////////////////////////////////////////////////////////////
//////////////////////// Set-Up ////////////////////////////
////////////////////////////////////////////////////////////

var margin = { left: 20, top: 20, right: 20, bottom: 20 },
  width = Math.min(window.innerWidth, 700) - margin.left - margin.right,
  height = Math.min(window.innerWidth, 700) - margin.top - margin.bottom,
  innerRadius = Math.min(width, height) * 0.39,
	outerRadius = innerRadius * 1.1;

var Names = [
    "order",
    "billing",
    "queue",
    "email",
    "user",
    "payment"
  ],
  colors = ["#301E1E", "#083E77", "#342350", "#567235", "#8B161C", "#DF7C00"],
  opacityDefault = 0.8;

var matrix = [
  [0, 4, 3, 2, 5, 2], //order
  [4, 0, 3, 2, 4, 3], //billing
  [3, 3, 0, 2, 3, 3], //queue
  [2, 2, 2, 0, 3, 3], //email
  [5, 4, 3, 3, 0, 2], //payment
  [2, 3, 3, 3, 2, 0] //payment
];

draw(matrix, Names, colors);

let es = new EventSource("http://localhost:3000/events");

es.addEventListener(
  "service:registered",
  event => {
    const msg = JSON.parse(event.data);
  },
  false
);

es.addEventListener(
  "error",
  event => {
    if (event.readyState == EventSource.CLOSED) {
      console.log("Event was closed");
      console.log(EventSource);
    }
  },
  false
);

function rerender() {
  var svg = d3.select("svg").remove();
  draw(matrix, Names, colors);
}

function draw(matrix, Names, colors) {
  ////////////////////////////////////////////////////////////
  /////////// Create scale and layout functions //////////////
  ////////////////////////////////////////////////////////////

  var colors = d3.scale
    .ordinal()
    .domain(d3.range(Names.length))
    .range(colors);

  //A "custom" d3 chord function that automatically sorts the order of the chords in such a manner to reduce overlap
  var chord = customChordLayout()
    .padding(0.15)
    .sortChords(d3.descending) //which chord should be shown on top when chords cross. Now the biggest chord is at the bottom
    .matrix(matrix);

  var arc = d3.svg
    .arc()
    .innerRadius(innerRadius * 1.01)
    .outerRadius(outerRadius);

  var path = d3.svg.chord().radius(innerRadius);

  ////////////////////////////////////////////////////////////
  ////////////////////// Create SVG //////////////////////////
  ////////////////////////////////////////////////////////////

  var svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr(
      "transform",
      "translate(" +
        (width / 2 + margin.left) +
        "," +
        (height / 2 + margin.top) +
        ")"
    );

  ////////////////////////////////////////////////////////////
  /////////////// Create the gradient fills //////////////////
  ////////////////////////////////////////////////////////////

  //Function to create the id for each chord gradient
  function getGradID(d) {
    return "linkGrad-" + d.source.index + "-" + d.target.index;
  }

  //Create the gradients definitions for each chord
  var grads = svg
    .append("defs")
    .selectAll("linearGradient")
    .data(chord.chords())
    .enter()
    .append("linearGradient")
    .attr("id", getGradID)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", function(d, i) {
      return (
        innerRadius *
        Math.cos(
          (d.source.endAngle - d.source.startAngle) / 2 +
            d.source.startAngle -
            Math.PI / 2
        )
      );
    })
    .attr("y1", function(d, i) {
      return (
        innerRadius *
        Math.sin(
          (d.source.endAngle - d.source.startAngle) / 2 +
            d.source.startAngle -
            Math.PI / 2
        )
      );
    })
    .attr("x2", function(d, i) {
      return (
        innerRadius *
        Math.cos(
          (d.target.endAngle - d.target.startAngle) / 2 +
            d.target.startAngle -
            Math.PI / 2
        )
      );
    })
    .attr("y2", function(d, i) {
      return (
        innerRadius *
        Math.sin(
          (d.target.endAngle - d.target.startAngle) / 2 +
            d.target.startAngle -
            Math.PI / 2
        )
      );
    });

  //Set the starting color (at 0%)
  grads
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", function(d) {
      return colors(d.source.index);
    });

  //Set the ending color (at 100%)
  grads
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", function(d) {
      return colors(d.target.index);
    });

  ////////////////////////////////////////////////////////////
  ////////////////// Draw outer Arcs /////////////////////////
  ////////////////////////////////////////////////////////////

  var outerArcs = svg
    .selectAll("g.group")
    .data(chord.groups)
    .enter()
    .append("g")
    .attr("class", "group")
    .on("mouseover", fade(0.1))
    .on("mouseout", fade(opacityDefault));

  outerArcs
    .append("path")
    .style("fill", function(d) {
      return colors(d.index);
    })
    .attr("d", arc)
    .each(function(d, i) {
      //Search pattern for everything between the start and the first capital L
      var firstArcSection = /(^.+?)L/;

      //Grab everything up to the first Line statement
      var newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
      //Replace all the comma's so that IE can handle it
      newArc = newArc.replace(/,/g, " ");

      //If the end angle lies beyond a quarter of a circle (90 degrees or pi/2)
      //flip the end and start position
      if (
        (d.endAngle > 90 * Math.PI / 180) &
        (d.startAngle < 270 * Math.PI / 180)
      ) {
        var startLoc = /M(.*?)A/, //Everything between the first capital M and first capital A
          middleLoc = /A(.*?)0 0 1/, //Everything between the first capital A and 0 0 1
          endLoc = /0 0 1 (.*?)$/; //Everything between the first 0 0 1 and the end of the string (denoted by $)
        //Flip the direction of the arc by switching the start en end point (and sweep flag)
        //of those elements that are below the horizontal line
        var newStart = endLoc.exec(newArc)[1];
        var newEnd = startLoc.exec(newArc)[1];
        var middleSec = middleLoc.exec(newArc)[1];

        //Build up the new arc notation, set the sweep-flag to 0
        newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
      } //if

      //Create a new invisible arc that the text can flow along
      svg
        .append("path")
        .attr("class", "hiddenArcs")
        .attr("id", "arc" + i)
        .attr("d", newArc)
        .style("fill", "none");
    });

  ////////////////////////////////////////////////////////////
  ////////////////// Append Names ////////////////////////////
  ////////////////////////////////////////////////////////////

  //Append the label names on the outside
  outerArcs
    .append("text")
    .attr("class", "titles")
    .attr("dy", function(d, i) {
      return (d.endAngle > 90 * Math.PI / 180) &
        (d.startAngle < 270 * Math.PI / 180)
        ? 25
        : -16;
    })
    .append("textPath")
    .attr("startOffset", "50%")
    .style("text-anchor", "middle")
    .attr("xlink:href", function(d, i) {
      return "#arc" + i;
    })
    .text(function(d, i) {
      return Names[i];
    });

  ////////////////////////////////////////////////////////////
  ////////////////// Draw inner chords ///////////////////////
  ////////////////////////////////////////////////////////////

  svg
    .selectAll("path.chord")
    .data(chord.chords)
    .enter()
    .append("path")
    .attr("class", "chord")
    .style("fill", function(d) {
      return "url(#" + getGradID(d) + ")";
    })
    .style("opacity", opacityDefault)
    .attr("d", path)
    .on("mouseover", mouseoverChord)
    .on("mouseout", mouseoutChord);

  ////////////////////////////////////////////////////////////
  ////////////////// Extra Functions /////////////////////////
  ////////////////////////////////////////////////////////////

  //Returns an event handler for fading a given chord group.
  function fade(opacity) {
    return function(d, i) {
      svg
        .selectAll("path.chord")
        .filter(function(d) {
          return d.source.index !== i && d.target.index !== i;
        })
        .transition()
        .style("opacity", opacity);
    };
  } //fade

  //Highlight hovered over chord
  function mouseoverChord(d, i) {
    //Decrease opacity to all
    svg
      .selectAll("path.chord")
      .transition()
      .style("opacity", 0.1);
    //Show hovered over chord with full opacity
    d3
      .select(this)
      .transition()
      .style("opacity", 1);

    //Define and show the tooltip over the mouse location
    $(this).popover({
      placement: "auto top",
      container: "body",
      mouseOffset: 10,
      followMouse: true,
      trigger: "hover",
      html: true,
      content: function() {
        return (
          "<p style='font-size: 11px; text-align: center;'><span style='font-weight:900'>" +
          Names[d.source.index] +
          "</span> and <span style='font-weight:900'>" +
          Names[d.target.index] +
          "</span> appeared together in <span style='font-weight:900'>" +
          d.source.value +
          "</span> movies </p>"
        );
      }
    });
    $(this).popover("show");
  } //mouseoverChord

  //Bring all chords back to default opacity
  function mouseoutChord(d) {
    //Hide the tooltip
    $(".popover").each(function() {
      $(this).remove();
    });
    //Set opacity back to default for all
    svg
      .selectAll("path.chord")
      .transition()
      .style("opacity", opacityDefault);
  } //function mouseoutChord
}
