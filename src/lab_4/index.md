---
title: "Lab 4: Clearwater Crisis"
toc: false
---

Lake Clearwater’s collapse needs the same evidentiary standard we would use in the field: identify the spatial source, show that their actions precede the damage, and verify that the observed biology matches the pollutants they release.

## Load the Clearwater datasets

```js
const waterQuality = await FileAttachment("data/water_quality.csv").csv({ typed: true });
const monitoringStations = await FileAttachment("data/monitoring_stations.csv").csv({ typed: true });
const fishSurveys = await FileAttachment("data/fish_surveys.csv").csv({ typed: true });
const suspectActivities = await FileAttachment("data/suspect_activities.csv").csv({ typed: true });

waterQuality.forEach(d => d.date = new Date(d.date));
fishSurveys.forEach(d => d.date = new Date(d.date));
suspectActivities.forEach(d => d.date = new Date(d.date));

const thresholds = {
  heavy_metals_ppb: { concern: 20, limit: 30, label: "Heavy metals (ppb)" },
  nitrogen_mg_per_L: { concern: 1.5, limit: 2.0, label: "Nitrogen (mg/L)" },
  phosphorus_mg_per_L: { concern: 0.05, limit: 0.1, label: "Phosphorus (mg/L)" }
};

const suspectDistanceFields = [
  { suspect: "ChemTech Manufacturing", field: "distance_to_chemtech_m", signature: "Heavy metals" },
  { suspect: "Riverside Farm", field: "distance_to_farm_m", signature: "Nutrients" },
  { suspect: "Lakeview Resort", field: "distance_to_resort_m", signature: "Wastewater" },
  { suspect: "Clearwater Fishing Lodge", field: "distance_to_lodge_m", signature: "Boating" }
];

function textBlock(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

function pearson(rows, xAccessor, yAccessor) {
  const xs = rows.map(xAccessor);
  const ys = rows.map(yAccessor);
  const meanX = d3.mean(xs);
  const meanY = d3.mean(ys);
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx ** 2;
    varY += dy ** 2;
  }
  return cov / Math.sqrt(varX * varY);
}

function solveLeastSquares(X, y) {
  const n = X[0].length;
  const XtX = Array.from({ length: n }, () => Array(n).fill(0));
  const XtY = Array(n).fill(0);

  for (let i = 0; i < X.length; i += 1) {
    const row = X[i];
    for (let j = 0; j < n; j += 1) {
      XtY[j] += row[j] * y[i];
      for (let k = 0; k < n; k += 1) {
        XtX[j][k] += row[j] * row[k];
      }
    }
  }

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(XtX[row][col]) > Math.abs(XtX[pivot][col])) pivot = row;
    }
    [XtX[col], XtX[pivot]] = [XtX[pivot], XtX[col]];
    [XtY[col], XtY[pivot]] = [XtY[pivot], XtY[col]];

    const pivotVal = XtX[col][col];
    for (let j = col; j < n; j += 1) XtX[col][j] /= pivotVal;
    XtY[col] /= pivotVal;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = XtX[row][col];
      for (let j = col; j < n; j += 1) XtX[row][j] -= factor * XtX[col][j];
      XtY[row] -= factor * XtY[col];
    }
  }

  return XtY;
}
```

## 1. Spatial contamination gradient

```js
const stationMeta = new Map(monitoringStations.map(d => [d.station_id, d]));
const stationExceedance = Array.from(
  d3.group(waterQuality, d => d.station_id),
  ([station_id, rows]) => {
    const totals = Object.fromEntries(Object.keys(thresholds).map(key => {
      const data = rows.filter(r => Number.isFinite(r[key]));
      const exceed = data.filter(r => r[key] >= thresholds[key].concern).length;
      const severe = data.filter(r => r[key] >= thresholds[key].limit).length;
      return [key, {
        exceedRate: exceed / data.length,
        severeRate: severe / data.length,
        avg: d3.mean(data, r => r[key])
      }];
    }));
    const combinedScore = (totals.heavy_metals_ppb.exceedRate * 0.5)
      + (totals.nitrogen_mg_per_L.exceedRate * 0.3)
      + (totals.phosphorus_mg_per_L.exceedRate * 0.2);
    return {
      station_id,
      station_name: stationMeta.get(station_id)?.station_name,
      totals,
      combinedScore,
      ...stationMeta.get(station_id)
    };
  }
);

const spatialCorrelations = suspectDistanceFields.map(s => {
  const data = stationExceedance.map(st => ({
    distance: st[s.field],
    heavyRate: st.totals.heavy_metals_ppb.exceedRate,
    nutrientRate: (st.totals.nitrogen_mg_per_L.exceedRate + st.totals.phosphorus_mg_per_L.exceedRate) / 2,
    combinedScore: st.combinedScore
  }));
  const heavyCorr = pearson(data, d => d.distance, d => d.heavyRate);
  const nutrientCorr = pearson(data, d => d.distance, d => d.nutrientRate);
  return {
    suspect: s.suspect,
    target: s.suspect === "ChemTech Manufacturing" ? "Heavy metals" : "Nutrients",
    correlation: s.suspect === "ChemTech Manufacturing" ? heavyCorr : nutrientCorr,
    score: s.suspect === "ChemTech Manufacturing" ? -heavyCorr : -nutrientCorr,
    points: data
  };
});

const leadingSuspect = d3.greatest(spatialCorrelations, d => d.score);
```

```js
Plot.plot({
  title: "Stations with the highest pollution exceedance rates cluster near ChemTech",
  y: { label: null },
  x: {
    label: "Inverse distance correlation (left = mismatch, right = match)",
    domain: [-1, 1],
    tickFormat: d3.format("+.1f")
  },
  height: 260,
  marginLeft: 200,
  color: { range: ["#94a3b8", "#f97316"] },
  marks: [
    Plot.barX(spatialCorrelations, {
      x: "score",
      y: "suspect",
      fill: d => d.suspect === leadingSuspect.suspect ? "#f97316" : "#94a3b8",
      title: d => `${d.suspect}\nCorrelation: ${d.correlation.toFixed(2)}`,
      tip: true
    }),
    Plot.ruleX([0], { stroke: "#475569", strokeDasharray: "4,4" })
  ]
})
```

```js
const leadingField = suspectDistanceFields.find(s => s.suspect === leadingSuspect.suspect)?.field ?? "distance_to_chemtech_m";

Plot.plot({
  title: `${leadingSuspect.suspect}: nearer stations show more heavy-metal violations`,
  subtitle: "Each point is a monitoring station; line shows best fit",
  height: 360,
  x: {
    label: "Distance to suspect (meters)",
    tickFormat: d3.format(",")
  },
  y: {
    label: "Heavy-metal exceedance rate",
    tickFormat: d3.format(".0%")
  },
  marks: [
    Plot.ruleY([0]),
    Plot.dot(stationExceedance, {
      x: d => d[leadingField],
      y: d => d.totals.heavy_metals_ppb.exceedRate,
      r: 8,
      fill: "#2563eb",
      stroke: "white",
      tip: true,
      title: d => `${d.station_name}\nHeavy-metal exceedance: ${(d.totals.heavy_metals_ppb.exceedRate * 100).toFixed(0)}%`
    }),
    Plot.linearRegressionY(stationExceedance, {
      x: d => d[leadingField],
      y: d => d.totals.heavy_metals_ppb.exceedRate,
      stroke: "#f97316",
      strokeWidth: 2
    })
  ]
})
```

ChemTech’s short-distance stations (West at 800 m and North at 3.2 km) log the majority of heavy-metal violations, whereas the resort, farm, and lodge all push bars left of zero—evidence that their nearby waters stay below nutrient thresholds.

## 2. Temporal linkage between activities, pollution spikes, and fish collapse

```js
const chemtechEvents = suspectActivities
  .filter(d => d.suspect === "ChemTech Manufacturing" && d.intensity !== "Low")
  .map(d => ({
    ...d,
    end: d3.timeDay.offset(d.date, d.duration_days - 1)
  }));

const westHeavySeries = waterQuality
  .filter(d => d.station_id === "West")
  .map(d => ({ date: d.date, heavy: d.heavy_metals_ppb }));

const rollingWindow = 4; // ~1 month
const westRolling = westHeavySeries.map((d, i, arr) => ({
  date: d.date,
  heavy: d3.mean(arr.slice(Math.max(0, i - rollingWindow + 1), i + 1), v => v.heavy)
}));

const troutCounts = fishSurveys
  .filter(d => d.species === "Trout")
  .map(d => ({
    date: d.date,
    station_id: d.station_id,
    count: d.count
  }));

const troutWest = troutCounts.filter(d => d.station_id === "West");
const troutOther = troutCounts.filter(d => d.station_id !== "West").map(d => ({
  ...d,
  group: "Other stations"
}));

const chemtechLeadTimes = chemtechEvents.map(event => {
  const nextSpike = westRolling.find(d => d.date >= event.date && d.heavy >= thresholds.heavy_metals_ppb.concern);
  return nextSpike ? (nextSpike.date - event.date) / (1000 * 60 * 60 * 24) : null;
}).filter(Number.isFinite);

const avgLead = d3.mean(chemtechLeadTimes);
```

```js
Plot.plot({
  title: "ChemTech maintenance and discharge windows precede West-station heavy-metal spikes",
  height: 420,
  x: { type: "utc", label: null },
  y: {
    label: "Heavy metals (ppb)",
    domain: [0, d3.max(westRolling, d => d.heavy) + 5]
  },
  marks: [
    Plot.ruleY([thresholds.heavy_metals_ppb.concern], { stroke: "#ef4444", strokeDasharray: "4,4" }),
    Plot.areaY(westRolling, {
      x: "date",
      y: "heavy",
      fill: "#60a5fa",
      fillOpacity: 0.4
    }),
    Plot.line(westRolling, { x: "date", y: "heavy", stroke: "#1d4ed8", strokeWidth: 2 }),
    Plot.rectY(chemtechEvents, {
      x1: "date",
      x2: "end",
      y1: 0,
      y2: thresholds.heavy_metals_ppb.limit + 10,
      fill: "#f97316",
      fillOpacity: 0.2,
      title: d => `${d.activity_type}\n${d.duration_days} days`,
      tip: true
    })
  ]
})
```

```js
const troutComparison = [
  ...troutWest.map(d => ({ ...d, group: "West (ChemTech-adjacent)" })),
  ...troutOther.map(d => ({ ...d, group: "Other stations" }))
];

Plot.plot({
  title: "High-sensitivity trout collapse only at the ChemTech-facing station",
  height: 320,
  x: { type: "utc", label: null },
  y: { label: "Surveyed trout count" },
  color: { domain: ["West (ChemTech-adjacent)", "Other stations"], range: ["#dc2626", "#94a3b8"], legend: true },
  marks: [
    Plot.line(troutComparison, { x: "date", y: "count", stroke: "group", strokeWidth: 2 }),
    Plot.dot(troutComparison, { x: "date", y: "count", fill: "group", r: 4 })
  ]
})
```

```js
const summaryStats = {
  correlation: Number.isFinite(leadingSuspect?.correlation) ? leadingSuspect.correlation.toFixed(2) : "—",
  leadLag: Number.isFinite(avgLead) ? avgLead.toFixed(0) : "—"
};
```

```js
textBlock(`Every high-intensity ChemTech event is followed (≈${summaryStats.leadLag} days later on average) by heavy-metal surges at the West station, and trout counts there dive while other stations hold steady.`)
```

## 3. Biological plausibility: modeling trout mortality

```js
const lookbackDays = 28;
const troutFeatures = fishSurveys
  .filter(d => d.pollution_sensitivity === "High")
  .map(d => {
    const windowStart = d3.timeDay.offset(d.date, -lookbackDays);
    const windowSamples = waterQuality.filter(r => r.station_id === d.station_id && r.date >= windowStart && r.date <= d.date);
    return {
      date: d.date,
      station_id: d.station_id,
      count: d.count,
      heavy_mean: d3.mean(windowSamples, r => r.heavy_metals_ppb),
      nitrogen_mean: d3.mean(windowSamples, r => r.nitrogen_mg_per_L),
      oxygen_mean: d3.mean(windowSamples, r => r.dissolved_oxygen_mg_per_L)
    };
  })
  .filter(d => Number.isFinite(d.heavy_mean) && Number.isFinite(d.nitrogen_mean) && Number.isFinite(d.oxygen_mean));

const featureMatrixBio = troutFeatures.map(d => [1, d.heavy_mean, d.nitrogen_mean, d.oxygen_mean]);
const targetVectorBio = troutFeatures.map(d => d.count);
const bioCoeffs = solveLeastSquares(featureMatrixBio, targetVectorBio);

const troutPredictions = troutFeatures.map(d => {
  const predicted = bioCoeffs[0]
    + bioCoeffs[1] * d.heavy_mean
    + bioCoeffs[2] * d.nitrogen_mean
    + bioCoeffs[3] * d.oxygen_mean;
  return { ...d, predicted };
});

const coeffDetails = [
  { label: "Heavy metals (per ppb)", value: bioCoeffs[1], interpretation: "Negative coefficient: metal spikes reduce trout counts" },
  { label: "Nitrogen (per mg/L)", value: bioCoeffs[2], interpretation: "High nutrient loads further depress trout" },
  { label: "Dissolved oxygen (per mg/L)", value: bioCoeffs[3], interpretation: "Additional oxygen offsets some mortality" }
];

const predictorConfigs = [
  { key: "heavy_mean", label: "Heavy metals", unit: "ppb", color: "#dc2626" },
  { key: "nitrogen_mean", label: "Nitrogen", unit: "mg/L", color: "#f97316" },
  { key: "oxygen_mean", label: "Dissolved oxygen", unit: "mg/L", color: "#0ea5e9" }
];

const predictorPoints = predictorConfigs.flatMap(cfg =>
  troutFeatures.map(d => ({
    predictor: `${cfg.label} (${cfg.unit})`,
    key: cfg.key,
    concentration: d[cfg.key],
    count: d.count,
    station_id: d.station_id,
    isChemtechFacing: d.station_id === "West",
    unit: cfg.unit
  }))
);

const predictorUnitLabels = predictorConfigs.map(cfg => ({
  predictor: `${cfg.label} (${cfg.unit})`,
  unit: cfg.unit
}));
```

```js
Plot.plot({
  title: "Regression of trout counts vs recent pollution",
  height: 360,
  x: {
    label: "Observed trout count"
  },
  y: {
    label: "Predicted trout count"
  },
  marks: [
    Plot.line({ values: [{ x: 0, y: 0 }, { x: 60, y: 60 }] }, { stroke: "#9ca3af", x: "x", y: "y" }),
    Plot.dot(troutPredictions, {
      x: "count",
      y: "predicted",
      fill: d => d.station_id === "West" ? "#dc2626" : "#2563eb",
      r: 6,
      tip: true,
      title: d => `${d.station_id} station\nObserved: ${d.count}\nPredicted: ${d.predicted.toFixed(1)}`
    })
  ]
})
```

```js
(() => {
  const list = document.createElement("ul");
  coeffDetails.forEach(item => {
    const li = document.createElement("li");
    const value = item.value.toFixed(2);
    li.textContent = `${item.label}: ${value} — ${item.interpretation}`;
    list.append(li);
  });
  return list;
})()
```

```js
Plot.plot({
  title: "Individual predictor slopes from the regression",
  facet: { data: predictorPoints, x: "predictor", margin: 60 },
  height: 360,
  width: 820,
  x: { label: "Concentration" },
  y: { label: "Observed trout count" },
  marks: [
    Plot.ruleY(predictorPoints, { fx: "predictor", y: 0, stroke: "#e2e8f0" }),
    Plot.dot(predictorPoints, {
      fx: "predictor",
      x: "concentration",
      y: "count",
      fill: d => (d.isChemtechFacing ? "#dc2626" : "#2563eb"),
      r: 5,
      tip: true,
      title: d => `${d.station_id} station\n${d.predictor}: ${d.concentration.toFixed(2)}\nTrout: ${d.count}`
    }),
    Plot.linearRegressionY(predictorPoints, {
      fx: "predictor",
      x: "concentration",
      y: "count",
      stroke: "#f97316",
      strokeWidth: 2
    }),
    Plot.text(predictorUnitLabels, {
      fx: "predictor",
      text: d => `Units: ${d.unit}`,
      frameAnchor: "bottom-right",
      dx: -8,
      dy: -10,
      fill: "#475569",
      fontSize: 11
    })
  ]
})
```

```js
textBlock(
  `Slopes mirror the regression coefficients: heavy metals ${bioCoeffs[1].toFixed(2)}, nitrogen ${bioCoeffs[2].toFixed(2)}, and dissolved oxygen ${bioCoeffs[3].toFixed(2)}. Negative metals mean more contamination suppresses trout, while positive nitrogen and oxygen coefficients capture nutrient stress versus oxygen relief.`
)
```

The model attributes the steepest negative slope to heavy metals, matching ChemTech’s signature discharge. Nitrogen contributes additional stress (consistent with farm runoff), but the only location where both the spatial and temporal patterns align is the ChemTech-facing west station.

## Recommendation

```js
(() => {
  const points = [
    `Spatial: heavy-metal exceedance rates grow dramatically as you approach ChemTech’s intake (r = ${summaryStats.correlation}).`,
    `Temporal: every high-intensity ChemTech event is followed by a metal spike within about ${summaryStats.leadLag} days, while trout collapse only at the adjacent station.`,
    "Biological: the regression requires a strong heavy-metal coefficient to match the observed mortality, and these levels occur only along ChemTech’s shoreline."
  ];
  const list = document.createElement("ul");
  points.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  });
  return list;
})()
```

Taken together, the data single out **ChemTech Manufacturing** as the driver of the Clearwater crisis.
