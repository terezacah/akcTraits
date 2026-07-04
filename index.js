let data;
let averages;
let groupData;
let colorScale;
let barChart;
let wordCloud;
let parallelCoords;
let color;

const reds = ["#581C1C", "#6B1E1E", "#7C2D12", "#9A3412", "#C2410C", "#EA580C", "#D97706", "#F59E0B", "#EAB308"];

const characteristics = {
  "energy_level_category": ["Couch Potato", "Calm", "Regular Exercise", "Energetic", "Needs Lots of Activity"],
  "trainability_category": ["May Be Stubborn", "Independent", "Agreeable", "Easy Training", "Eager to Please"],
  "demeanor_category": ["Aloof/Wary", "Reserved with Strangers", "Alert/Responsive", "Friendly", "Outgoing"],
  "grooming_frequency_category": ["Occasional Bath/Brush", "Weekly Brushing", "2-3 Times a Week Brushing", "Daily Brushing", "Specialty/Professional"],
  "shedding_category": ["Infrequent", "Occasional", "Seasonal", "Regularly", "Frequent"]
};

const axes = ["demeanor_value", "trainability_value", "grooming_frequency_value", "shedding_value", "energy_level_value", "life_expectancy", "weight", "height"];
const traitAxes = axes.slice(0, 5);
const axisLegend0 = ["Aloof/Wary", "May Be Stubbron", "Occasional Bath/Brush", "Infrequent", "Couch Potato", "(Years)", "(Cm)", "(Kg)"];
const axisLegend1 = ["Outgoing", "Eager to Please", "Specialty/Professional", "Frequent", "Needs Lots of Activity", "(Years)", "(Cm)", "(Kg)"];

const tooltip = d3.select(".tooltip");

d3.csv("./akc-data-latest.csv", d => {
  return {
    breed: d["breed"],
    description: d["description"],
    temperament: d["temperament"],
    min_height: +d["min_height"],
    max_height: +d["max_height"],
    min_weight: +d["min_weight"],
    max_weight: +d["max_weight"],
    min_expectancy: +d["min_expectancy"],
    max_expectancy: +d["max_expectancy"],
    group: d["group"],
    grooming_frequency_value: +d["grooming_frequency_value"],
    grooming_frequency_category: d["grooming_frequency_category"],
    shedding_value: +d["shedding_value"],
    shedding_category: d["shedding_category"],
    energy_level_value: +d["energy_level_value"],
    energy_level_category: d["energy_level_category"],
    trainability_value: +d["trainability_value"],
    trainability_category: d["trainability_category"],
    demeanor_value: +d["demeanor_value"],
    demeanor_category: d["demeanor_category"]
  };
}).then(csvData => {
  data = csvData;
  let groups = d3.group(data, d => d.group);
  averages = Array.from(groups, ([group, breeds]) => ({
    group,
    averages: {
      demeanor_value: d3.sum(breeds, d => d.demeanor_value) / breeds.length,
      trainability_value: d3.sum(breeds, d => d.trainability_value) / breeds.length,
      grooming_frequency_value: d3.sum(breeds, d => d.grooming_frequency_value) / breeds.length,
      shedding_value: d3.sum(breeds, d => d.shedding_value) / breeds.length,
      energy_level_value: d3.sum(breeds, d => d.energy_level_value) / breeds.length,
      life_expectancy: d3.sum(breeds, d => (d.min_expectancy + d.max_expectancy) / 2) / breeds.length,
      weight: d3.sum(breeds, d => (d.min_weight + d.max_weight) / 2) / breeds.length,
      height: d3.sum(breeds, d => (d.min_height + d.max_height) / 2) / breeds.length,
    },
  })); 

  drawParallelCoordinates();
});

function drawParallelCoordinates() {
  let mapColorTo = axes[0]; 

  d3.select("#parallel_coords_div")
    .append("text")
    .text("Map Color Scale (Darkest to Lightest) to Axis: ")
    .style("font-weight", "bold")
    .style("margin-left", '50px');

  d3.select("#parallel_coords_div")
    .append("select")
    .style("padding", "1px")
    .style("background-color", "lemonchiffon")
    .on("change", function () {
      mapColorTo = this.value; 
      drawPaths(mapColorTo);
    })
    .selectAll("option")
    .data(axes)
    .enter()
    .append("option")
    .text(d => d.replace(/_/g, " ").toUpperCase())
    .attr("value", d => d);

  const margin = { top: 50, right: 100, bottom: 50, left: 100 },
        width = d3.select("#parallel_coords_div").node().clientWidth - margin.left - margin.right,
        height = d3.select("#parallel_coords_div").node().clientHeight / 2 - margin.top - margin.bottom;

  parallelCoords = d3.select("#parallel_coords_div")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  x = d3.scalePoint()
    .domain(axes)
    .range([0, width]);

  y = {};
  axes.forEach(dimension => {
    if (traitAxes.includes(dimension)) {
      y[dimension] = d3.scaleLinear()
        .domain([0.2, 1]) 
        .range([height, 0]);
    } else {
      y[dimension] = d3.scaleLinear()
        .domain([d3.min(averages, d => d.averages[dimension]), d3.max(averages, d => d.averages[dimension])])
        .nice()
        .range([height, 0]);
    }
  });

  axes.forEach((dimension, i) => {
    let axis = parallelCoords
      .append("g")
      .attr("transform", `translate(${x(dimension)}, 0)`)
      .call(d3.axisLeft(y[dimension]));

    axis
      .append("text")
      .attr("y", -25)
      .attr("text-anchor", "middle")
      .text(dimension.replace(/_/g, " ").toUpperCase())
      .style("fill", "black");

    axis
      .append("text")
      .attr("y", -10)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .text(axisLegend1[i])
      .style("fill", "black");

    axis
      .append("text")
      .attr("y", height + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "black")
      .text(axisLegend0[i]);
  });

  drawPaths(mapColorTo);  
}

function drawPaths(colorAxis) {
  parallelCoords.selectAll(".path").remove();
  let line = d3.line().curve(d3.curveLinear);

  let colorScale = d3.scaleQuantile()
    .domain(averages.map(d => d.averages[colorAxis])) 
    .range(reds);

  parallelCoords
    .selectAll(".path")
    .data(averages)
    .join("path")
    .attr("class", "path")
    .attr("d", d => line(axes.map(dimension => [x(dimension), y[dimension](d.averages[dimension])])))
    .attr("fill", "none")
    .attr("stroke", d => colorScale(d.averages[colorAxis])) 
    .attr("stroke-width", 2)
    .attr("opacity", 0.7)
    .style("cursor", "pointer") 
    .on("click", (event, d) => {
      const groupName = d.group;
      color = colorScale(d.averages[colorAxis]);
      drawBarChart(groupName);
      drawWordCloud(groupName);
    })
    .on("mouseover", function () {d3.select(this).attr("stroke-width", 4).attr("opacity", 1);})
    .on("mouseout", function () {d3.select(this).attr("stroke-width", 2).attr("opacity", 0.8);});

    d3.select("#parallel_coords_legend").selectAll("*").remove();

    const legendContainer = d3.select("#parallel_coords_legend")
      .append("h3")
      .text("◄ Average Values of Groups")
    
    averages.forEach(d => {
      let legendItem = legendContainer
        .append("div")
        .style("display", "flex")
        .style("margin", "8px 25px")
        .style("cursor", "pointer") 
        .on("click", () => {
          const groupName = d.group;
          color = colorScale(d.averages[colorAxis]);
          drawBarChart(groupName);
          drawWordCloud(groupName);
        })
  
      legendItem
        .append("div")
        .style("width", "20px")
        .style("height", "20px")
        .style("background-color", colorScale(d.averages[colorAxis]))
        .style("margin-right", "5px")
        .style("border-radius", "10px");
  
      legendItem
        .append("text")
        .text(d.group)
        .style("font-size", "14px")
    });
}


function drawWordCloud(groupName) {
  groupData = data.filter(d => d.group == groupName);

  let words = [];

  groupData.forEach(d => {
    if (d.temperament) {
      d.temperament.split(",").forEach(word => words.push(word.trim()));
      console.log(d.temperament);
    }
  });


  let wordCounts = Array.from(d3.group(words, d => d), ([word, occurrences]) => ({word, size: occurrences.length}));
  let topWords = wordCounts.sort((a, b) => b.size - a.size).slice(0, 10);

  d3.select("#wordcloud_div").selectAll("*").remove();

  const margin = { top: 0, right: 0, bottom: 0, left: 0 },
      width = d3.select("#wordcloud_div").node().clientWidth / 1.1 - margin.left - margin.right,
      height = d3.select("#wordcloud_div").node().clientHeight / 1.7 - margin.top - margin.bottom;

  wordCloud = d3.select("#wordcloud_div")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  let fontSizeScale = d3.scaleLinear()
    .domain([d3.min(topWords, d => d.size), d3.max(topWords, d => d.size)]) 
    .range([25, 60]); 

  let layout = d3.layout.cloud()
      .size([width, height])
      .words(topWords)
      .padding(10)
      .rotate(0)
      .fontSize(d => fontSizeScale(d.size))
      .on("end", function(topWords) {
        drawLayout(topWords, layout);
      });

  layout.start();
}

function drawLayout(words, layout) {
  wordCloud.append("g")
      .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
      .selectAll("text")
      .data(words)
      .enter().append("text")
      .style("font-size", d => d.size + "px")
      .style("fill", color)
      .attr("text-anchor", "middle")
      .style("font-family", "Impact")
      .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
      .text(d => d.word);
}

function drawBarChart(groupName) {
  groupData = data.filter(d => d.group == groupName);  

  let selectedCategory = "energy_level_category"; 

  d3.select("#group_data").selectAll("*").remove();

  d3.select("#group_data")
    .append("h1")
    .text(groupName)
    .style("color", color);

  let dropdown = d3.select("#group_data")
    .append("select")
    .style("padding", "1px")
    .style("background-color", "lemonchiffon")
    .style("color", color)
    .on("change", (event) => {
      selectedCategory = event.target.value;
      updateBarChart(selectedCategory); 
    });

  dropdown.selectAll("option")
    .data(Object.keys(characteristics))
    .enter()
    .append("option")
    .text(d => d.replace(/_/g, " ").toUpperCase())
    .attr("value", d => d);

  updateBarChart(selectedCategory); 
}

function updateBarChart(category) {
  let selected = characteristics[category];

  const margin = { top: 20, right: 20, bottom: 50, left: 100 },
        width = d3.select("#barchart_div").node().clientWidth - margin.left - margin.right,
        height = d3.select("#barchart_div").node().clientHeight / 1.5 - margin.top - margin.bottom;

  let categoryCounts = selected.map(currentCat => {
    const count = groupData.filter(d => d[category] == currentCat).length;
    return {
      category: currentCat,
      count: count,
      breeds: groupData.filter(d => d[category] == currentCat).map(d => d.breed)
    };
  });

  if (barChart) {
    barChart.selectAll("*").remove();
  } else {
    barChart = d3.select("#barchart_div").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
  }

  let x = d3.scaleBand()
    .domain(categoryCounts.map(d => d.category))
    .range([margin.left, width + margin.right])
    .padding(0.1);

  let y = d3.scaleLinear()
    .domain([0, d3.max(categoryCounts, d => d.count)])
    .nice()
    .range([height, margin.top]);

  barChart.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  barChart.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  barChart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", margin.left / 1.5)
    .attr("x", -height / 2)
    .style("text-anchor", "middle")
    .text("Number of Breeds")
    .style("fill", color)
    .style("font-size", "12px");

  barChart.selectAll("rect")
    .data(categoryCounts)
    .enter()
    .append("rect")
    .attr("x", d => x(d.category))
    .attr("y", d => y(d.count))
    .attr("height", d => y(0) - y(d.count))
    .attr("width", x.bandwidth())
    .attr("fill", color)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(d.breeds.join(", ")) 
        .style("left", event.pageX + "px") 
        .style("top", event.pageY + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0); 
    });
}


