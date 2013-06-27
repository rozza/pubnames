    // Wordle options

    var fill = d3.scale.category20b();
    var statusText = d3.select("#status");

    var w = 800,
      h = 500;

    var scale = d3.scale["log"](),
      words = [],
      tags,
      old_tags,
      fontSize = d3.scale["sqrt"]().range([10, 60]);

    var layout = d3.layout.cloud()
      .timeInterval(10)
      .size([w, h])
      .font("Impact")
      .spiral("archimedean")
      .fontSize(function(d) { return fontSize(+d.size); })
      .text(function(d) { return d.text; })
      .rotate(function() {
        rotate_scale = d3.scale.linear();
        rotate_scale.domain([0, 2]).range([-90, 90]);
        return rotate_scale(~~(Math.random() * 3));
      })
      .on("end", draw);

    var svg = d3.select("#wordle").append("svg")
      .attr("width", w)
      .attr("height", h);

    var background = svg.append("g"),
      vis = svg.append("g")
        .attr("transform", "translate(" + [w >> 1, h >> 1] + ")");

    function load() {
      d3.json("/pubs.json?bbox=" + map.getBounds().toBBoxString(), process);
    }

    function process(data) {
      tags = data.pubs;
      words = [];
      if (tags.length) fontSize.domain([tags[tags.length - 1].size || 1, tags[0].size]);
      layout
      .stop()
      .words(tags);
      statusText.style("display", "none");
      layout.start();
      drawn = true;
    }

    function draw(data, bounds) {
      scale = bounds ? Math.min(
        w / Math.abs(bounds[1].x - w / 2),
        w / Math.abs(bounds[0].x - w / 2),
        h / Math.abs(bounds[1].y - h / 2),
        h / Math.abs(bounds[0].y - h / 2)) / 2 : 1;
      words = data;
      var text = vis.selectAll("text")
        .data(words, function(d) { return d.text.toLowerCase(); });
      text.transition()
        .duration(1000)
        .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
        .style("font-size", function(d) { return d.size + "px"; });
      text.enter().append("text")
        .attr("text-anchor", "middle")
        .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
        .style("font-size", function(d) { return d.size + "px"; })
        .style("opacity", 1e-6)
      .transition()
        .duration(1000)
        .style("opacity", 1);
      text.style("font-family", function(d) { return d.font; })
        .style("fill", function(d) { return fill(d.text.toLowerCase()); })
        .text(function(d) { return d.text; });
      var exitGroup = background.append("g")
        .attr("transform", vis.attr("transform"));
      var exitGroupNode = exitGroup.node();
      text.exit().each(function() {
      exitGroupNode.appendChild(this);
      });
      exitGroup.transition()
        .duration(1000)
        .style("opacity", 1e-6)
        .remove();
      vis.transition()
        .delay(1000)
        .duration(750)
        .attr("transform", "translate(" + [w >> 1, h >> 1] + ")scale(" + scale + ")");
    }

    // Map options

    var southWest = new L.LatLng(45, -15),
      northEast = new L.LatLng(66, 6),
      bounds = new L.LatLngBounds(southWest, northEast),
      reloadTimer;

    var map = L.map('map', {maxBounds: bounds}).setView([55, -4.3], 1);
    var currentBounds = map.getBounds();
    var drawn = false;
    var redraw = function() {
      layout.stop();
      window.clearTimeout(reloadTimer);
      var bounds = map.getBounds();
      if (!drawn || !bounds.equals(currentBounds)) {
      currentBounds = map.getBounds();
      reloadTimer = window.setTimeout(function(){load();}, 850);
      }
    }
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('locationfound', function(e) {
      if (bounds.contains(e.latlng)) {
      drawn = false;
      layout.stop();
      map.setView(e.latlng, 10);
      }
    });
    map.on("moveend", redraw);
    map.locate();
    redraw();