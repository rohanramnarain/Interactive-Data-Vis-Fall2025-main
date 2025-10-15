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

// Long-form weather view (kept for possible extensions).
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
// FIX: split into three small plots so each metric gets its own x-scale/units.
// -----------------------------------------------------------------------------
const figTemp = Plot.plot({
  height: 320,
  marginLeft: 48,
  marginBottom: 40,
  x: {label: "Temperature (°C)", domain: d3.extent(pollinators, d => d.temperature)},
  y: {grid: true, label: "Mean visit count"},
  color: {legend: true, label: "Weather condition"},
  marks: [
    Plot.dot(pollinators, Plot.binX(
      {y: "mean", thresholds: 10},
      {x: "temperature", y: "visit_count", stroke: "weather_condition", r: 2, tip: true}
    )),
    Plot.line(pollinators, Plot.binX(
      {y: "mean", thresholds: 10},
      {x: "temperature", y: "visit_count", stroke: "weather_condition"}
    )),
    bestTemp && Plot.ruleX([bestTemp.center], {stroke: "currentColor", strokeDasharray: "4,4", opacity: 0.8}),
    Plot.frame()
  ]
});

const figHum = Plot.plot({
  height: 320,
  marginLeft: 48,
  marginBottom: 40,
  x: {label: "Humidity (%)", domain: d3.extent(pollinators, d => d.humidity)},
  y: {grid: true, label: "Mean visit count"},
  color: {legend: false},
  marks: [
    Plot.dot(pollinators, Plot.binX(
      {y: "mean", thresholds: 10},
      {x: "humidity", y: "visit_count", stroke: "weather_condition", r: 2, tip: true}
    )),
    Plot.line(pollinators, Plot.binX(
      {y: "mean", thresholds: 10},
      {x: "humidity", y: "visit_count", stroke: "weather_condition"}
    )),
    bestHum && Plot.ruleX([bestHum.center], {stroke: "currentColor", strokeDasharray: "4,4", opacity: 0.8}),
    Plot.frame()
  ]
});

const figWind = Plot.plot({
  height: 320,
  marginLeft: 48,
  marginBottom: 40,
  x: {label: "Wind Speed (km/h)", domain: d3.extent(pollinators, d => d.wind_speed)},
  y: {grid: true, label: "Mean visit count"},
  color: {legend: false},
  marks: [
    Plot.dot(pollinators, Plot.binX(
      {y: "mean", thresholds: 8},
      {x: "wind_speed", y: "visit_count", stroke: "weather_condition", r: 2, tip: true}
    )),
    Plot.line(pollinators, Plot.binX(
      {y: "mean", thresholds: 8},
      {x: "wind_speed", y: "visit_count", stroke: "weather_condition"}
    )),
    bestWind && Plot.ruleX([bestWind.center], {stroke: "currentColor", strokeDasharray: "4,4", opacity: 0.8}),
    Plot.frame()
  ]
});

// Assemble Panel B as a single “middle section”
const figWeather = html`<div style="display:grid;grid-template-columns:repeat(3,minmax(280px,1fr));gap:1rem;"></div>`;
figWeather.append(figTemp, figHum, figWind);

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
    <li><b>Ideal weather for pollinating:</b> Across all observations, the weather condition with the highest average visits is <b>${bestCondition?.condition ?? "n/a"}</b> (${bestCondition ? d3.format(".2f")(bestCondition.meanVisits) : "n/a"} mean visits). Peaks by metric are marked with dashed lines (middle section): 
      Temperature ≈ <b>${fmtRange(bestTemp)}</b> °C, 
      Humidity ≈ <b>${fmtRange(bestHum)}</b> %, 
      Wind ≈ <b>${fmtRange(bestWind)}</b> km/h.</li>
    <li><b>Most nectar:</b> The flower with the highest mean nectar is <b>${bestFlower?.flower ?? "n/a"}</b> 
      (${bestFlower ? d3.format(".2f")(bestFlower.mean) : "n/a"} μL) as shown in the right panel.</li>
  </ul>
  <div class="small">Tip: Hover on points and bars to see exact values.</div>
</div>`);
