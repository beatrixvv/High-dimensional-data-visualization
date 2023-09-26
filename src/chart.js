async function drawChart() {

  // 1. Access data
  const dataset = await d3.json("./data/education.json")

  // get sex variables
  const sexAccessor = d => d.sex
  const sex = ["female", "male"]
  const sexIds = d3.range(sex.length)
  
  // Get education and socioeconomic variables
  const sesAccessor = d => d.ses
  const sesNames = ["low", "middle", "high"]
  const sesIds = d3.range(sesNames.length)

  const educationAccessor = d => d.education
  const educationNames = ["<High School", "High School", "Some Post-secondary", "Post-secondary", "Associate's", "Bachelor's and up"]
  const educationIds = d3.range(educationNames.length)
  // End

  // Stack Probabilities
  const stackProbabilities = {}
  const getStatusKey = ({sex, ses}) => [sex, ses].join("--")
  dataset.forEach(x => {
    let status = getStatusKey(x)
    stackProbabilities[status] = []
    let sum = 0
    educationNames.forEach(y => {
      sum += x[y] / 100
      if (y == "Bachelor's and up") {sum = 1}
      stackProbabilities[status].push(sum)
    })
  })
  // End


  // Create person
  let currentPersonId = 0

  function generatePerson(elapsed) {
    const id_sex = getRandomValue(sexIds)
    const id_ses = getRandomValue(sesIds)
    const id_education = d3.bisect(stackProbabilities[[sex[id_sex], sesNames[id_ses]].join("--")], getRandomNumberInRange(0, 1))
    currentPersonId += 1
    
    return {
      sex: id_sex,
      ses: id_ses,
      education: id_education, 
      id: currentPersonId,
      yJitter: getRandomNumberInRange(-15, 15), // make people to follow the dots easily
      startTime: elapsed + getRandomNumberInRange(-0.1, 0.1)
    }
  }

  // 2. Create chart dimensions
  const width = d3.min([
    window.innerWidth * 0.9,
    1200
  ])
  let dimensions = {
    width: width,
    height: 500,
    margin: {
      top: 10,
      right: 200,
      bottom: 10,
      left: 120,
    },
    pathHeight: 50,
    endsBarWidth: 20,
    endingBarPadding: 5,
    endingTextPadding: 50
  }
  dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  // 3. Draw canvas
  const wrapper = d3.select("#wrapper")
    .append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)

  const bounds = wrapper.append("g")
      .style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

  // 4. Create scales
  const xScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, dimensions.boundedWidth])
    .clamp(true)

  const startYScale = d3.scaleLinear()
    .domain([-1, 3])
    .range([dimensions.boundedHeight, 0])

  const endYScale = d3.scaleLinear()
    .domain([-1, 6])
    .range([dimensions.boundedHeight, 0])

  const colorScale = d3.scaleLinear()
    .domain(sesIds)
    .range(["#459395", "#EB7C69", "#FDA638"])
  // End

  const yTransitionProgressScale = d3.scaleLinear()
    .domain([0.45, 0.55]) // x progress
    .range([0, 1])        // y progress
    .clamp(true)

  // 5. Draw data

  const div = 6
  // Define linkGenerator and linkOptions
  const linkGenerator = (d, i) => {
    if (i < (div/2)) {return startYScale(d[0])}
    else {return endYScale(d[1])}
  }

  const repeat_arr = (x, y) => {
    let arr = []
    for (let i = 0; i < div; i++) {
      arr.push([x, y])
    }
    return arr
  }

  let linkOptions = []
  sesIds.forEach(x => {
    educationIds.forEach(y => linkOptions = d3.merge([[repeat_arr(x, y)], linkOptions]))})

  const linkLineGenerator = d3.line()
    .curve(d3.curveMonotoneX)
    .x((d, i) => xScale(i / (div-1)))
    .y((d, i) => linkGenerator(d, i))
  // End

  const linksGroup = bounds.append("g")
  const links = linksGroup.selectAll(".category-path")
    .data(linkOptions)
    .join("path")
      .attr("class", "category-path")
      .attr("d", linkLineGenerator)
      .attr("stroke-width", dimensions.pathHeight)
      
  // 6. Draw peripherals

  // start labels
  const startingLabelsGroup = bounds.append("g")
      .style("transform", "translateX(-20px)")

  const startingLabels = startingLabelsGroup.selectAll(".start-label")
    .data(sesIds)
    .join("text")
      .attr("class", "label start-label")
      .attr("y", (d, i) => startYScale(i))
      .text((d, i) => sentenceCase(sesNames[i]))

  const startLabel = startingLabelsGroup.append("text")
      .attr("class", "start-title")
      .attr("y", startYScale(sesIds[sesIds.length - 1]) - 65)
      .text("Socioeconomic")
  const startLabelLineTwo = startingLabelsGroup.append("text")
      .attr("class", "start-title")
      .attr("y", startYScale(sesIds[sesIds.length - 1]) - 50)
      .text("Status")

  // Add the starting bars on the left
  const startingBars = startingLabelsGroup.selectAll(".start-bar")
    .data(sesIds)
    .join("rect")
      .attr("x", 20)
      .attr("y", d => startYScale(d) - (dimensions.pathHeight/ 2))
      .attr("width", dimensions.endsBarWidth)
      .attr("height", dimensions.pathHeight)
      .attr("fill", colorScale)


  // end labels
  const endingLabelsGroup = bounds.append("g")
      .style("transform", `translateX(${
        dimensions.boundedWidth + 20
      }px)`)

  const endingLabels = endingLabelsGroup.selectAll(".end-label")
    .data(educationNames)
    .join("text")
      .attr("class", "label end-label")
      .attr("y", (d, i) => endYScale(i) - 15)
      .text(d => d)

  // drawing circle and triangle for female and male, respectively
  const femaleMarkers = endingLabelsGroup.selectAll(".female-marker")
    .data(educationIds)
    .join("circle")
      .attr("class", "ending-marker female-marker")
      .attr("r", 5.5)
      .attr("cx", 5)
      .attr("cy", d => endYScale(d) + 5)

  const trianglePoints = [
    "-7,  6",
    " 0, -6",
    " 7,  6",
  ].join(" ")
  const maleMarkers = endingLabelsGroup.selectAll(".male-marker")
    .data(educationIds)
    .join("polygon")
      .attr("class", "ending-marker male-marker")
      .attr("points", trianglePoints)
      .attr("transform", d => `translate(5, ${endYScale(d) + 20})`)

  const legendGroup = bounds.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${dimensions.boundedWidth}, 5)`)

  const femaleLegend = legendGroup.append("g")
      .attr("transform", `translate(${
        - dimensions.endsBarWidth * 1.5
        + dimensions.endingBarPadding
        + 1
      }, 0)`)
  femaleLegend.append("circle")
      .attr("r", 5.5)
      .attr("transform", "translate(-7, 0)")
  femaleLegend.append("text")
      .attr("class", "legend-text-left")
      .text("Female")
      .attr("x", -20)
  femaleLegend.append("line")
      .attr("class", "legend-line")
      .attr("x1", -dimensions.endsBarWidth / 2 + 1)
      .attr("x2", -dimensions.endsBarWidth / 2 + 1)
      .attr("y1", 12)
      .attr("y2", 37)

  const maleLegend = legendGroup.append("g")
      .attr("transform", `translate(${
        - dimensions.endsBarWidth / 2
        - 4
      }, 0)`)
  maleLegend.append("polygon")
      .attr("points", trianglePoints)
      .attr("transform", "translate(5, 0)")
  maleLegend.append("text")
      .attr("class", "legend-text-right")
      .text("Male")
      .attr("x", 15)
  maleLegend.append("line")
      .attr("class", "legend-line")
      .attr("x1", dimensions.endsBarWidth / 2 - 3)
      .attr("x2", dimensions.endsBarWidth / 2 - 3)
      .attr("y1", 12)
      .attr("y2", 37)

  // 7. Set up interactions

  //people list  will hold all of simulated people 
  //<g> element will hold all of people markers
  const maximumPeople = 10000
  let people = []
  const markersGroup = bounds.append("g")
      .attr("class", "markers-group")
  const endingBarGroup = bounds.append("g")
      .attr("transform", `translate(${dimensions.boundedWidth}, 0)`)

  function updateMarkers(elapsed) {
    const xProgressAccessor = d => (elapsed - d.startTime) / 5000 // a person takes 5 seconds (5000 milliseconds) to cross the chart
    if (people.length < maximumPeople) {
      people = [
        ...people,
        ...d3.range(2).map(() => generatePerson(elapsed)), //pass our elapsed milliseconds to each person as they are created
      ]
    }

    // define females and males respectively  
    const females = markersGroup.selectAll(".marker-circle")
      .data(people.filter(d => sexAccessor(d) == 0), d => d.id)
      .join(
        enter => enter.append("circle")
          .attr("class", "marker marker-circle")
          .attr("r", 5.5)
          .attr("opacity", 0),

        update => update.style("transform", d => {
            const x = xScale(xProgressAccessor(d))
            const yStart = startYScale(sesAccessor(d))
            const yEnd = endYScale(educationAccessor(d))
            const yChange = yEnd - yStart
            const yProgress = yTransitionProgressScale(
              xProgressAccessor(d)
            )
            const y =  yStart
              + (yChange * yProgress)
              + d.yJitter
          return `translate(${ x }px, ${ y }px)`
          })
      )

    const males = markersGroup.selectAll(".marker-triangle")
      .data(people.filter(d => sexAccessor(d) == 1), d => d.id)
      .join(
        enter => enter.append("polygon")
          .attr("class", "marker marker-triangle")
          .attr("points", trianglePoints)
          .attr("opacity", 0),

        update => update.style("transform", d => {
          const x = xScale(xProgressAccessor(d))
          const yStart = startYScale(sesAccessor(d))
          const yEnd = endYScale(educationAccessor(d))
          const yChange = yEnd - yStart
          const yProgress = yTransitionProgressScale(
            xProgressAccessor(d)
          )
          const y =  yStart
            + (yChange * yProgress)
            + d.yJitter
        return `translate(${ x }px, ${ y }px)`
        })
      )
    // End

    const markers = d3.selectAll(".marker")

    markers.attr("fill", d => colorScale(sesAccessor(d)))
        .transition().duration(100)
        .style("opacity", d => (xScale(xProgressAccessor(d)) < 20 || xScale(xProgressAccessor(d)) > dimensions.boundedWidth - 50)
        ? 0
        : 1
        )
        
    const endingGroups = educationIds.map(endId => (
      people.filter(d => (
        xProgressAccessor(d) >= 1
        && educationAccessor(d) == endId
      ))
    ))
    const endingPercentages = d3.merge(
      endingGroups.map((peopleWithSameEnding, endingId) => (
        d3.merge(
          sexIds.map(sexId => (
            sesIds.map(sesId => {
              const peopleInBar = peopleWithSameEnding.filter(d => (
                sexAccessor(d) == sexId
              ))
              const countInBar = peopleInBar.length
              const peopleInBarWithSameStart = peopleInBar.filter(d => (
                sesAccessor(d) == sesId
              ))
              const count = peopleInBarWithSameStart.length
              const numberOfPeopleAbove = peopleInBar.filter(d => (
                sesAccessor(d) > sesId
              )).length

              return {
                endingId,
                sesId,
                sexId,
                count,
                countInBar,
                percentAbove: numberOfPeopleAbove / (peopleInBar.length || 1),
                percent: count / (countInBar || 1),
              }
            })
          ))
        )
      ))
    )

    endingBarGroup.selectAll(".ending-bar")
      .data(endingPercentages)
      .join("rect")
        .attr("class", "ending-bar")
        .attr("x", d => -dimensions.endsBarWidth * (d.sexId + 1)
          - (d.sexId * dimensions.endingBarPadding)
        )
        .attr("width", dimensions.endsBarWidth)
        .attr("y", d => endYScale(d.endingId)
          - dimensions.pathHeight / 2
          + dimensions.pathHeight * d.percentAbove
        )
        .attr("height", d => d.countInBar
          ? dimensions.pathHeight * d.percent
          : dimensions.pathHeight
        )
        .attr("fill", d => d.countInBar
          ? colorScale(d.sesId)
          : "#dadadd"
        )

    // Update number
    endingLabelsGroup.selectAll(".ending-value")
      .data(endingPercentages)
      .join("text")
        .attr("class", "ending-value")
        .attr("x", d => (d.sesId * dimensions.endingTextPadding) + dimensions.endingTextPadding)
        .attr("y", d => endYScale(d.endingId) + (d.sexId * 17) + 10)
        .style("font-size", "12px")
        .style("fill", d => d.count 
          ? colorScale(d.sesId)
          : "#dadadd"
        )
        .text(d => d.count)
    
    let sum = 0
    endingPercentages.forEach(d => sum += d.count)
    if (sum == maximumPeople) {timer.stop()}
    // End
    
  }
  const timer = d3.timer(updateMarkers)
}

drawChart()


// utility functions

const getRandomNumberInRange = (min, max) => Math.random() * (max - min) + min

const getRandomValue = arr => arr[Math.floor(getRandomNumberInRange(0, arr.length))]

const sentenceCase = str => [
  str.slice(0, 1).toUpperCase(),
  str.slice(1),
].join("")