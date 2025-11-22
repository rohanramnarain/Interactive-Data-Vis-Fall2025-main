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