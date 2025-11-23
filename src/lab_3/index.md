---
title: "Lab 3: Mayoral Mystery - by Rohan R. Ramnarain"
toc: false
---



<!-- Import Data -->
```js
const nyc = await FileAttachment("data/nyc.json").json();
const results = await FileAttachment("data/election_results.csv").csv({ typed: true });
const survey = await FileAttachment("data/survey_responses.csv").csv({ typed: true });
const events = await FileAttachment("data/campaign_events.csv").csv({ typed: true });
```


```js
// The nyc file is saved in data as a topoJSON instead of a geoJSON. Thats primarily for size reasons -- it saves us 3MB of data. For Plot to render it, we have to convert it back to its geoJSON feature collection. 
const districts = topojson.feature(nyc, nyc.objects.districts)
```

## Candidate vote share by district

The campaign team’s first request is a choropleth view of the NYC districts. To ground the story, we’re mapping the candidate’s vote share (candidate votes divided by total two-party votes), which highlights where the campaign already resonates and where additional outreach is needed.

```js
const voteShare = results.map(d => ({
  boro_cd: d.boro_cd,
  income: d.income_category,
  turnout: d.turnout_rate,
  share: d.votes_candidate / (d.votes_candidate + d.votes_opponent),
  median_income: d.median_household_income
}));

const districtStats = new Map(voteShare.map(d => [d.boro_cd, d]));
const shareExtent = [
  Math.min(...voteShare.map(d => d.share)),
  Math.max(...voteShare.map(d => d.share))
];
const incomeExtent = d3.extent(voteShare, d => d.median_income);

const districtCentroids = districts.features
  .map(feature => {
    const stats = districtStats.get(feature.properties.BoroCD);
    if (!stats) return null;
    return {
      ...stats,
      coordinates: d3.geoCentroid(feature)
    };
  })
  .filter(Boolean);

const incomeTiers = ["Low", "Middle", "High"];
const incomeColors = {
  Low: "#ff8c42",      // vibrant orange
  Middle: "#ff6b35",   // orange-red
  High: "#d62828"      // deep red
};

const blockScale = d3.scaleQuantize()
  .domain(incomeExtent)
  .range(d3.range(1, 6));

const blockThresholds = blockScale.thresholds();
const blockLegendRows = blockScale.range().map((level, index, arr) => {
  const lower = index === 0 ? incomeExtent[0] : blockThresholds[index - 1];
  const upper = index === arr.length - 1 ? incomeExtent[1] : blockThresholds[index];
  return {
    level,
    lower,
    upper
  };
});

const formatIncomeRange = (lower, upper) => {
  const lowerK = Math.round(lower / 1000);
  const upperK = Math.round(upper / 1000);
  return `$${lowerK}K–$${upperK}K`;
};

const blockHeight = 0.0025;
const blockWidth = 0.005;

const incomeBlocks = districtCentroids.flatMap(d => {
  const blocks = blockScale(d.median_income);
  return Array.from({ length: blocks }, (_, level) => ({
    ...d,
    level,
    y1: d.coordinates[1] + level * blockHeight,
    y2: d.coordinates[1] + (level + 1) * blockHeight,
    x1: d.coordinates[0] - blockWidth / 2,
    x2: d.coordinates[0] + blockWidth / 2
  }));
});
```

```js
Plot.plot({
  projection: {
    domain: districts,
    type: "mercator",
  },
  height: 720,
  width: 800,
  color: {
    type: "sequential",
    scheme: "blues",
    domain: shareExtent,
    label: "Candidate vote share",
    legend: true,
    tickFormat: d => `${(d * 100).toFixed(0)}%`
  },
  marks: [
    Plot.geo(districts, {
      fill: d => districtStats.get(d.properties.BoroCD)?.share,
      stroke: "#f8f9fa",
      strokeWidth: 0.5,
      tip: true,
      title: d => {
        const stats = districtStats.get(d.properties.BoroCD);
        if (!stats) return `District ${d.properties.BoroCD}\nNo election data`;
        return `District ${stats.boro_cd}\nVote share: ${(stats.share * 100).toFixed(1)}%\nTurnout: ${stats.turnout.toFixed(1)}%\nIncome: ${stats.income}\nMedian HH income: $${stats.median_income.toLocaleString()}`;
      }
    }),
    Plot.rect(incomeBlocks, {
      x1: d => d.x1,
      x2: d => d.x2,
      y1: d => d.y1,
      y2: d => d.y2,
      fill: d => incomeColors[d.income],
      fillOpacity: 0.9,
      stroke: "#1b1b1b",
      strokeWidth: 0.3,
      tip: true,
      title: d => `District ${d.boro_cd}\nVote share: ${(d.share * 100).toFixed(1)}%\nBlocks (income level): ${blockScale(d.median_income)}\nMedian HH income: $${d.median_income.toLocaleString()}\nIncome tier: ${d.income}`
    })
  ]
})

```

```js
Plot.legend({
  color: {
    type: "ordinal",
    domain: incomeTiers,
    range: incomeTiers.map(tier => incomeColors[tier]),
    label: "Income tier (block color)"
  }
})
```

```js
(() => {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "4px";

  const title = document.createElement("strong");
  title.textContent = "Stack height guide";
  container.append(title);

  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "16px";

  blockLegendRows.forEach(row => {
    const item = document.createElement("li");
    item.textContent = `${row.level} block${row.level > 1 ? "s" : ""}: ${formatIncomeRange(row.lower, row.upper)}`;
    list.append(item);
  });

  container.append(list);
  return container;
})()
```

More stacked blocks ≈ higher median household income. The scale is quantized into five levels spanning roughly $35K–$143K.
The map surfaces a clear pattern: districts in Manhattan and parts of Queens (high-income areas) skew toward the opponent (lighter shades), while pockets of the Bronx and Brooklyn show stronger candidate support. The stacked “income blocks” sit atop each district like a mini topographic column—more blocks mean higher median household income, and block color reinforces the tier. This makes it easy to spot well-off areas where the candidate still underperforms (tall red stacks in uptown Manhattan/Queens) versus lower-income districts that already favor the campaign. Those Bronx/Brooklyn pockets—especially 109, 210, and 312—can anchor success if replicated elsewhere, while the tallest stacks with weak vote share highlight where future GOTV investments and message testing should concentrate.

## Issue sentiment vs. vote choice

```js
const issueFields = [
  { key: "affordable_housing_alignment", label: "Affordable housing" },
  { key: "public_transit_alignment", label: "Public transit" },
  { key: "childcare_support_alignment", label: "Childcare support" },
  { key: "small_business_tax_alignment", label: "Small business taxes" },
  { key: "police_reform_alignment", label: "Police reform" }
];

const sentimentRows = issueFields.flatMap(({ key, label }) => {
  return ["Candidate", "Opponent"].map(vote => {
    const responses = survey.filter(d => d.voted_for === vote && Number.isFinite(d[key]));
    const total = responses.length;
    const high = responses.filter(d => d[key] >= 4).length;
    const low = responses.filter(d => d[key] <= 2).length;
    const netSentiment = total ? (high / total) - (low / total) : 0;
    const avgAlignment = total ? d3.mean(responses, d => d[key]) : null;
    const direction = vote === "Candidate" ? 1 : -1;
    return {
      issue: label,
      issue_key: key,
      group: vote === "Candidate" ? "Supporter" : "Opponent",
      netSentiment,
      displaySentiment: netSentiment * direction,
      avgAlignment,
      responses: total
    };
  });
});
```

```js
Plot.plot({
  y: {
    domain: issueFields.map(d => d.label),
    label: null
  },
  x: {
    domain: [-1, 1],
    label: "Net sentiment (share ≥4 minus share ≤2)",
    grid: true,
    inset: 0.02
  },
  color: {
    domain: ["Supporter", "Opponent"],
    range: ["#2980b9", "#c0392b"],
    legend: true,
    label: "Respondent voted for"
  },
  marginLeft: 180,
  marginRight: 50,
  marks: [
    Plot.ruleX([0], { stroke: "#999" }),
    Plot.barX(sentimentRows, {
      x: "displaySentiment",
      y: "issue",
      fill: "group",
      stroke: "white",
      title: d => `${d.issue} — ${d.group}\nNet sentiment: ${(d.netSentiment * 100).toFixed(0)}%\nAvg alignment: ${d.avgAlignment ? d.avgAlignment.toFixed(2) : "n/a"}\nResponses: ${d.responses}`
    })
  ]
})
```

Supporters rate the campaign’s housing, transit, childcare, and small business planks strongly (net sentiment > +60%), while opponents are net negative on every issue except transit. (Opponent bars are mirrored to the left for quick comparison.) Police reform is the clearest wedge: supporters still view it favorably, but opponents show the deepest negative scores, reinforcing the anecdotal survey quotes about discomfort with that stance. This chart signals which policy stories can rally the base (housing, childcare) and which ones need message reframing to avoid alienating persuadable voters.

## GOTV effort vs. turnout

```js
const gotvData = results.map(d => ({
  boro_cd: d.boro_cd,
  doors: d.gotv_doors_knocked,
  hours: d.candidate_hours_spent,
  turnout: d.turnout_rate,
  income: d.income_category
}));

const meanDoors = d3.mean(gotvData, d => d.doors);
const meanTurnout = d3.mean(gotvData, d => d.turnout);
const covariance = d3.sum(gotvData, d => (d.doors - meanDoors) * (d.turnout - meanTurnout));
const varianceDoors = d3.sum(gotvData, d => (d.doors - meanDoors) ** 2);
const varianceTurnout = d3.sum(gotvData, d => (d.turnout - meanTurnout) ** 2);
const slope = covariance / varianceDoors;
const intercept = meanTurnout - slope * meanDoors;
const correlation = covariance / Math.sqrt(varianceDoors * varianceTurnout);
const rSquared = correlation ** 2;
const doorExtent = d3.extent(gotvData, d => d.doors);
const regressionLine = doorExtent.map(doors => ({ doors, turnout: slope * doors + intercept }));
const gotvStats = {
  slope,
  intercept,
  correlation,
  rSquared
};
```

```js
Plot.plot({
  height: 500,
  marginLeft: 70,
  marginRight: 30,
  x: {
    label: "Doors knocked (GOTV)",
    grid: true,
    tickFormat: d => d3.format(",")(d)
  },
  y: {
    label: "Voter turnout (%)",
    grid: true,
    domain: [35, 90]
  },
  color: {
    domain: ["Low", "Middle", "High"],
    range: ["#4c78a8", "#f58518", "#e45756"],
    label: "District income tier",
    legend: true
  },
  marks: [
    Plot.dot(gotvData, {
      x: "doors",
      y: "turnout",
      fill: "income",
      r: 4,
      fillOpacity: 0.85,
      stroke: "#111",
      tip: true,
      title: d => `District ${d.boro_cd}\nTurnout: ${d.turnout.toFixed(1)}%\nDoors knocked: ${d.doors.toLocaleString()}\nCandidate hours: ${d.hours}`
    }),
    Plot.line(regressionLine, {
      x: "doors",
      y: "turnout",
      stroke: "white",
      strokeWidth: 2
    })
  ]
})
```

```js
(() => {
  const summary = document.createElement("p");
  summary.innerHTML = `<strong>Regression summary:</strong> slope = ${(gotvStats.slope).toFixed(4)} turnout percentage points per door, intercept = ${(gotvStats.intercept).toFixed(1)}%, correlation = ${(gotvStats.correlation).toFixed(2)}, R² = ${(gotvStats.rSquared).toFixed(2)}.`;
  return summary;
})()
```

```js
(() => {
  const narrative = document.createElement("p");
  narrative.textContent = `The GOTV operation reached deep into the districts, with several boroughs getting 6–8K door knocks, but there is only a very weakly positive relationship between that activity and turnout. Usually we look at correlation greater than 0.70 to say definitively that there is a actionable correlation, but the coefficient here is just a measly 0.19. The regression line indicates that every additional thousand doors correlates with roughly ${(gotvStats.slope * 1000).toFixed(1)} percentage-point gain in turnout (R² ≈ ${(gotvStats.rSquared).toFixed(2)}). We need to look at income and other factors in order to better guide a GOTV operation in the future because there was high turnout in places that did not have the most doors knocked, but the positive correlation suggests that some of the strongest turnouts cluster where doors knocked were highest, which means that the ground game delivered returns and should be a part of the plan in the future.`;
  return narrative;
})()

```

## Looking ahead: which levers move vote share?

```js
const nextCycleData = results.map(d => ({
  boro_cd: d.boro_cd,
  vote_share: d.votes_candidate / (d.votes_candidate + d.votes_opponent),
  doors: d.gotv_doors_knocked,
  doors_k: d.gotv_doors_knocked / 1000,
  hours: d.candidate_hours_spent,
  income: d.median_household_income,
  income_k: d.median_household_income / 1000,
  income_label: d.income_category
}));

const featureMatrix = nextCycleData.map(d => [1, d.doors_k, d.hours, d.income_k]);
const targetVector = nextCycleData.map(d => d.vote_share);

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

  // Gaussian elimination
  for (let col = 0; col < n; col += 1) {
    // pivot selection
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

function simpleLinearRegression(data, xAccessor, yAccessor) {
  const meanX = d3.mean(data, xAccessor);
  const meanY = d3.mean(data, yAccessor);
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  data.forEach(d => {
    const dx = xAccessor(d) - meanX;
    const dy = yAccessor(d) - meanY;
    covariance += dx * dy;
    varianceX += dx ** 2;
    varianceY += dy ** 2;
  });

  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const correlation = covariance / Math.sqrt(varianceX * varianceY);

  return {
    slope,
    intercept,
    correlation,
    rSquared: correlation ** 2
  };
}

const coeffs = solveLeastSquares(featureMatrix, targetVector);

const predictions = nextCycleData.map((d, idx) => {
  const features = featureMatrix[idx];
  const predicted = coeffs.reduce((sum, coef, j) => sum + coef * features[j], 0);
  return { ...d, predicted };
});

const meanShare = d3.mean(targetVector);
const sst = d3.sum(targetVector, val => (val - meanShare) ** 2);
const sse = d3.sum(predictions, d => (d.predicted - d.vote_share) ** 2);
const rsqShare = 1 - sse / sst;

const voteShareExtent = d3.extent(nextCycleData, d => d.vote_share);
const voteSharePadding = 0.03;
const voteShareDomain = [
  Math.max(0, voteShareExtent[0] - voteSharePadding),
  Math.min(1, voteShareExtent[1] + voteSharePadding)
];

const diagLine = [
  { actual: voteShareDomain[0], predicted: voteShareDomain[0] },
  { actual: voteShareDomain[1], predicted: voteShareDomain[1] }
];

const predictorConfigs = [
  {
    key: "doors_k",
    label: "Doors knocked (thousands)",
    accessor: d => d.doors_k,
    tooltipLabel: "Doors knocked",
    tooltipValue: d => `${d.doors.toLocaleString()} doors`,
    tickFormat: d3.format(".1f"),
    unitDescriptor: "per +1K doors"
  },
  {
    key: "hours",
    label: "Candidate hours spent",
    accessor: d => d.hours,
    tooltipLabel: "Candidate hours",
    tooltipValue: d => `${d.hours} hours`,
    tickFormat: d3.format(".0f"),
    unitDescriptor: "per candidate hour"
  },
  {
    key: "income_k",
    label: "Median income (thousands USD)",
    accessor: d => d.income_k,
    tooltipLabel: "Median household income",
    tooltipValue: d => `$${d.income.toLocaleString()}`,
    tickFormat: value => `$${value.toFixed(0)}K`,
    unitDescriptor: "per +$1K median income"
  }
];

const simpleRegressions = predictorConfigs.map(config => {
  const stats = simpleLinearRegression(nextCycleData, config.accessor, d => d.vote_share);
  const extent = d3.extent(nextCycleData, config.accessor);
  const paddingBase = extent[1] - extent[0];
  const padding = paddingBase ? paddingBase * 0.1 : Math.max(0.5, extent[0] * 0.1 || 0.5);
  const domain = [
    Math.max(0, extent[0] - padding),
    extent[1] + padding
  ];
  const linePoints = domain.map(value => ({
    x: value,
    y: stats.slope * value + stats.intercept
  }));
  return {
    ...config,
    stats,
    domain,
    linePoints
  };
});

const coeffSummary = [
  { label: "Intercept", coef: coeffs[0], units: "vote share" },
  { label: "Doors knocked (per 1K)", coef: coeffs[1], units: "share per 1K doors" },
  { label: "Candidate hours", coef: coeffs[2], units: "share per hour" },
  { label: "Median income (per $1K)", coef: coeffs[3], units: "share per $1K" }
];
```

### Single-factor regressions

Before combining predictors, each lever can be evaluated on its own to see how directly it tracks with vote share. The scatterplots below show every district along with the best-fit line from an individual linear regression.

```js
(() => {
  const stack = document.createElement("div");
  stack.style.display = "flex";
  stack.style.flexDirection = "column";
  stack.style.gap = "2rem";
  stack.style.maxWidth = "960px";
  stack.style.margin = "0 auto";

  simpleRegressions.forEach(reg => {
    const plot = Plot.plot({
      width: 900,
      height: 360,
      marginLeft: 80,
      marginRight: 40,
      marginBottom: 55,
      x: {
        label: reg.label,
        domain: reg.domain,
        tickFormat: reg.tickFormat,
        inset: 10
      },
      y: {
        label: "Vote share",
        domain: voteShareDomain,
        tickFormat: d3.format(".0%"),
        grid: true,
        inset: 10
      },
      marks: [
        Plot.dot(nextCycleData, {
          x: reg.accessor,
          y: d => d.vote_share,
          fill: "#4c78a8",
          r: 6,
          fillOpacity: 0.9,
          stroke: "#111",
          tip: true,
          title: d => `District ${d.boro_cd}\nVote share: ${(d.vote_share * 100).toFixed(1)}%\n${reg.tooltipLabel}: ${reg.tooltipValue(d)}`
        }),
        Plot.line(reg.linePoints, {
          x: "x",
          y: "y",
          stroke: "#f58518",
          strokeWidth: 2.5
        })
      ]
    });

    const figure = document.createElement("figure");
    figure.style.margin = "0";
    figure.append(plot);
    stack.append(figure);
  });

  return stack;
})()
```

```js
(() => {
  const wrapper = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent = "Slope values translate to percentage-point changes in vote share for a one-unit increase in each predictor.";
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  simpleRegressions.forEach(reg => {
    const li = document.createElement("li");
    li.textContent = `${reg.label}: ${(reg.stats.slope * 100).toFixed(2)} pts ${reg.unitDescriptor} (R² = ${reg.stats.rSquared.toFixed(2)})`;
    list.append(li);
  });
  wrapper.append(intro, list);
  return wrapper;
})()
```

### Combined multi-variable model

Individually, door knocks and candidate time slope upward while wealth slopes downward. The multivariate model captures the combined effect when all three move at once.

```js
Plot.plot({
  height: 420,
  marginLeft: 70,
  marginRight: 40,
  x: {
    label: "Actual vote share",
    domain: voteShareDomain,
    tickFormat: d3.format(".0%"),
    grid: true
  },
  y: {
    label: "Predicted vote share",
    domain: voteShareDomain,
    tickFormat: d3.format(".0%"),
    grid: true
  },
  color: {
    domain: ["Low", "Middle", "High"],
    range: ["#4c78a8", "#f58518", "#e45756"],
    label: "District income tier"
  },
  marks: [
    Plot.line(diagLine, {
      x: "actual",
      y: "predicted",
      stroke: "#9e9e9e",
      strokeDasharray: "6,4"
    }),
    Plot.dot(predictions, {
      x: "vote_share",
      y: "predicted",
      fill: "income_label",
      r: 5,
      fillOpacity: 0.85,
      stroke: "#111",
      tip: true,
      title: d => `District ${d.boro_cd}\nActual share: ${(d.vote_share * 100).toFixed(1)}%\nPredicted share: ${(d.predicted * 100).toFixed(1)}%\nDoors knocked: ${(d.doors_k * 1000).toLocaleString()}\nCandidate hours: ${d.hours}\nMedian income: $${(d.income_k * 1000).toLocaleString()}`
    })
  ]
})
```

```js
(() => {
  const container = document.createElement("div");
  const formula = document.createElement("pre");
  formula.style.background = "#111";
  formula.style.color = "#f1f1f1";
  formula.style.padding = "0.75rem";
  formula.style.borderRadius = "4px";
  formula.style.whiteSpace = "pre-wrap";
  formula.textContent = `VoteShare = ${coeffs[0].toFixed(3)} + ${coeffs[1].toFixed(3)} * Doors_k + ${coeffs[2].toFixed(3)} * Hours + ${coeffs[3].toFixed(3)} * Income_k`;

  const note = document.createElement("p");
  note.style.margin = "0.4rem 0 0";
  note.textContent = "Doors_k and Income_k are measured in thousands (1K doors knocked, $1K median income).";

  container.append(formula, note);
  return container;
})()
```

```js
(() => {
  const wrapper = document.createElement("div");
  wrapper.style.marginTop = "0.75rem";

  const coeffList = document.createElement("ul");
  coeffList.style.margin = "0";
  coeffList.style.paddingLeft = "18px";
  coeffSummary.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.label}: ${(item.coef * 100).toFixed(2)} percentage points per unit (${item.units})`;
    coeffList.append(li);
  });

  const rsq = document.createElement("p");
  rsq.textContent = `Model fit: R² = ${rsqShare.toFixed(2)} across ${predictions.length} districts.`;

  wrapper.append(coeffList, rsq);
  return wrapper;
})()
```

```js
(() => {
  const recommendation = document.createElement("p");
  const doorSingle = simpleRegressions.find(reg => reg.key === "doors_k");
  const hoursSingle = simpleRegressions.find(reg => reg.key === "hours");
  const incomeSingle = simpleRegressions.find(reg => reg.key === "income_k");
  const doorSlope = doorSingle ? (doorSingle.stats.slope * 100).toFixed(1) : (coeffs[1] * 100).toFixed(1);
  const hourSlope = hoursSingle ? (hoursSingle.stats.slope * 100).toFixed(1) : (coeffs[2] * 100).toFixed(1);
  const incomeSlope = incomeSingle ? Math.abs(incomeSingle.stats.slope * 100).toFixed(1) : Math.abs(coeffs[3] * 100).toFixed(1);
  recommendation.textContent = `Door-only regression shows roughly ${doorSlope} percentage-point gain in vote share per additional thousand doors, and each hour of candidate time adds about ${hourSlope} points on its own. Wealthier districts still slip by ~${incomeSlope} points per extra $1K in median income, underscoring the need for targeted economic framing when campaigning uptown. The combined model keeps those coefficients intact (R² ≈ ${rsqShare.toFixed(2)}), so the next campaign should double down on large-scale canvassing plus candidate visibility in working- and middle-income areas, while pairing high-income outreach with persuasion messaging to offset the negative income slope.`;
  return recommendation;
})()
```