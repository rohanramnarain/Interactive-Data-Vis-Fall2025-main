---
title: "Lab 1: Passing Pollinators"
toc: true
---

This dashboard uses the field study dataset in `/data/pollinator_activity_data.csv` to answer:

1. **What is the body mass and wing span distribution of each pollinator species?**  
2. **What is the ideal weather for pollinating (conditions, temperature, etc.)?**  
3. **Which flower has the most nectar production?**

<style>
/* Simple responsive grid for a single, cohesive visualization */
.figure-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: start;
}
.figure-caption {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.4;
}
.small {
  font-size: 0.9rem;
  color: #666;
}
</style>

```js
import * as d3 from "npm:d3@7";

// Load CSV (typed parsing for numbers/dates).
const pollinators = await FileAttachment("./data/pollinator_activity_data.csv").csv({typed: true});

// -----------------------------------------------------------------------------
// Derived helpers
// -----------------------------------------------------------------------------

// Long-form weather view so we can facet temperature / humidity / wind neatly.
const weatherLong = pollinators.flatMap(d => ([
  {metric: "Temperature (°C)", value: d.temperature, visit_count: d.visit_count, weather_condition: d.weather_condition},
  {metric: "Humidity (%)", value: d.humidity, visit_count: d.visit_count, weather_condition: d.weather_condition},
  {metric: "Wind Speed (km/h)", value: d.wind_speed, visit_count: d.visit_count, weather_condition: d.weather_condition}
]));

// Helper: compute binned max-mean-visit “sweet spots” for a continuous metric.
function bestBin(values, accessor, thresholds = 12) {
  const bins = d3.bin()
    .value(accessor)
    .domain(d3.extent(values, accessor))
    .thresholds(thresholds)(values);
  const stats = bins.map(b => ({
    x0: b.x0,
    x1: b.x1,
    center: (b.x0 + b.x1) / 2,
    meanVisits: d3.mean(b, d => d.visit_count)
  })).filter(d => Number.isFinite(d.meanVisits));
  return stats.length ? stats.reduce((a, b) => (b.meanVisits > a.meanVisits ? b : a)) : null;
}

const bestTemp = bestBin(pollinators, d => d.temperature);
const bestHum  = bestBin(pollinators, d => d.humidity);
const bestWind = bestBin(pollinators, d => d.wind_speed);

// Top weather condition by average visits.
const bestCondition = d3.rollups(
  pollinators,
  v => d3.mean(v, d => d.visit_count),
  d => d.weather_condition
).map(([condition, meanVisits]) => ({condition, meanVisits}))
 .sort((a, b) => d3.descending(a.meanVisits, b.meanVisits))[0];

// Mean nectar production by flower (for labeling/sorting).
const nectarMean = d3.rollups(
  pollinators,
  v => d3.mean(v, d => d.nectar_production),
  d => d.flower_species
).map(([flower, mean]) => ({flower, mean}))
 .sort((a, b) => d3.descending(a.mean, b.mean));

const bestFlower = nectarMean[0];

// -----------------------------------------------------------------------------
// Panel A: Mass vs Wing Span distribution (by species)
// -----------------------------------------------------------------------------
const figSpecies = Plot.plot({
  height: 320,
  grid: true,
  marginLeft: 48,
  marginBottom: 40,
  x: {label: "Wing span (mm)"},
  y: {label: "Body mass (g)"},
  color: {legend: true, label: "Species"},
  fx: {label: "Pollinator species"},
  marks: [
    // Distribution points per species facet
    Plot.dot(pollinators, {
      fx: "pollinator_species",
      x: "avg_wing_span_mm",
      y: "avg_body_mass_g",
      fill: "pollinator_species",
      r: 2,
      opacity: 0.7,
      tip: true
    }),
    // Optional trend within each species
    Plot.linearRegressionY(pollinators, {
      fx: "pollinator_species",
      x: "avg_wing_span_mm",
      y: "avg_body_mass_g",
      stroke: "pollinator_species",
      strokeWidth: 2,
      opacity: 0.9
    }),
    Plot.frame()
  ]
});

// -----------------------------------------------------------------------------
// Panel B: Ideal weather (conditions + temperature/humidity/wind)
// -----------------------------------------------------------------------------
const peaks = [
  bestTemp ? {metric: "Temperature (°C)", x: bestTemp.center} : null,
  bestHum  ? {metric: "Humidity (%)",     x: bestHum.center}  : null,
  bestWind ? {metric: "Wind Speed (km/h)",x: bestWind.center} : null
].filter(Boolean);

const figWeather = Plot.plot({
  height: 320,
  marginLeft: 48,
  marginBottom: 40,
  y: {grid: true, label: "Mean visit count"},
  fx: {label: "Weather dimension", domain: ["Temperature (°C)", "Humidity (%)", "Wind Speed (km/h)"]},
  color: {legend: true, label: "Weather condition"},
  marks: [
    // Smoothed (binned) mean visits, separated by condition, faceted by metric
    Plot.line(weatherLong, Plot.binX(
      {y: "mean", thresholds: 12},
      {fx: "metric", x: "value", y: "visit_count", stroke: "weather_condition"}
    )),
    Plot.dot(weatherLong, Plot.binX(
      {y: "mean", thresholds: 12},
      {fx: "metric", x: "value", y: "visit_count", stroke: "weather_condition", r: 2, tip: true}
    )),
    // Annotate the overall peaks per metric (dashed vertical rules)
    Plot.ruleX(peaks, {fx: "metric", x: "x", stroke: "currentColor", strokeDasharray: "4,4", opacity: 0.8}),
    Plot.frame()
  ]
});

// -----------------------------------------------------------------------------
// Panel C: Which flower has the most nectar?
// -----------------------------------------------------------------------------
const figNectar = Plot.plot({
  height: 320,
  marginLeft: 64,
  marginBottom: 40,
  y: {grid: true, label: "Mean nectar (μL)"},
  x: {label: "Flower species"},
  marks: [
    Plot.barY(nectarMean, {
      x: "flower", 
      y: "mean",
      sort: {x: "y", order: "descending"},
      tip: true
    }),
    // Label each bar with its mean value
    Plot.text(nectarMean, {
      x: "flower",
      y: "mean",
      text: d => d.mean.toFixed(2),
      dy: -6
    }),
    Plot.frame()
  ]
});

// -----------------------------------------------------------------------------
// Compose: single comprehensive visualization (three panels)
// -----------------------------------------------------------------------------
const container = html`<figure class="figure-grid"></figure>`;
container.append(figSpecies, figWeather, figNectar);
display(container);

// -----------------------------------------------------------------------------
// Auto-filled summary answers beneath the figure
// -----------------------------------------------------------------------------
const fmtRange = (b) => b ? `${d3.format(".1f")(b.x0)}–${d3.format(".1f")(b.x1)}` : "n/a";

display(html`<div class="figure-caption">
  <strong>What the dashboard shows:</strong><br/>
  <ul>
    <li><b>Distributions by species:</b> Each facet (left panel) shows the relationship between wing span and body mass for <em>Honeybee</em>, <em>Bumblebee</em>, and <em>Carpenter Bee</em> with a trend line.</li>
    <li><b>Ideal weather for pollinating:</b> Across all observations, the weather condition with the highest average visits is <b>${bestCondition?.condition ?? "n/a"}</b> (${bestCondition ? d3.format(".2f")(bestCondition.meanVisits) : "n/a"} mean visits). Peaks by metric are marked with dashed lines (middle panel): 
      Temperature ≈ <b>${fmtRange(bestTemp)}</b> °C, 
      Humidity ≈ <b>${fmtRange(bestHum)}</b> %, 
      Wind ≈ <b>${fmtRange(bestWind)}</b> km/h.</li>
    <li><b>Most nectar:</b> The flower with the highest mean nectar is <b>${bestFlower?.flower ?? "n/a"}</b> 
      (${bestFlower ? d3.format(".2f")(bestFlower.mean) : "n/a"} μL) as shown in the right panel.</li>
  </ul>
  <div class="small">Tip: Hover on points and bars to see exact values.</div>
</div>`);
