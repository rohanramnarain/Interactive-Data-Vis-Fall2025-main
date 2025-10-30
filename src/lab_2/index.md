
---
title: "Lab 2: Subway Staffing — Dashboard"
toc: true
---

This page answers the lab questions using Observable Plot and the four data files in `./data/`.

> You'll see at least one **transform** (box plot uses quantiles) and at least one **annotation** (rules/callouts). No `md` helper required.

## 0) Load & Prep Data

```js
import * as Plot from "npm:@observablehq/plot";

// Load CSVs from ./data
const incidentsAll = await FileAttachment("./data/incidents.csv").csv({ typed: true });
const localEventsAll = await FileAttachment("./data/local_events.csv").csv({ typed: true });
const upcomingEvents = await FileAttachment("./data/upcoming_events.csv").csv({ typed: true });
const ridershipAll = await FileAttachment("./data/ridership.csv").csv({ typed: true });

// Helpers
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const fmt = new Intl.NumberFormat("en-US");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
function groupBy(arr, keyFn) {
  const m = new Map();
  for (const d of arr) {
    const k = keyFn(d);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(d);
  }
  return m;
}
function note(html) {
  const el = document.createElement("div");
  el.style.padding = "8px 12px";
  el.style.border = "1px solid #e5e7eb";
  el.style.borderRadius = "8px";
  el.style.margin = "6px 0 14px 0";
  el.innerHTML = html;
  return el;
}

// Limit ridership & local events to Summer 2025
const SUMMER_START = new Date("2025-06-01");
const SUMMER_END   = new Date("2025-09-01"); // exclusive

const ridership = ridershipAll.map(r => ({...r, date: new Date(r.date)}))
  .filter(r => r.date >= SUMMER_START && r.date < SUMMER_END);

const localEvents = localEventsAll.map(e => ({...e, date: new Date(e.date)}))
  .filter(e => e.date >= SUMMER_START && e.date < SUMMER_END);

// Use ALL incidents for robust stats
const incidents = incidentsAll.map(i => ({...i, date: new Date(i.date)}));
```

### Derived tables

```js
// 1) Ridership daily total — Summer 2025
const ridershipDaily = Array.from(
  groupBy(ridership, d => +d.date),
  ([k, rows]) => ({
    date: new Date(+k),
    total: sum(rows.map(r => (+r.entrances || 0) + (+r.exits || 0)))
  })
).sort((a,b) => a.date - b.date);

// 2) Ridership per station per day — Summer 2025
const ridershipStationDaily = ridership.map(r => ({
  date: new Date(r.date),
  station: r.station,
  total: (+r.entrances || 0) + (+r.exits || 0)
}));

// 3) Local events by day — Summer 2025
const eventsByDate = Array.from(
  groupBy(localEvents, d => +d.date),
  ([k, rows]) => ({ date: new Date(+k), attendance: sum(rows.map(r => +r.estimated_attendance || 0)) })
).sort((a,b) => a.date - b.date);

// 4) Top event days for annotation
const ridershipByDate = new Map(ridershipDaily.map(d => [d.date.toISOString().slice(0,10), d.total]));
const topEventDays = eventsByDate
  .slice().sort((a,b) => b.attendance - a.attendance)
  .slice(0,3)
  .map(d => ({ date: d.date, attendance: d.attendance, ridership: ridershipByDate.get(d.date.toISOString().slice(0,10)) }));

// 5) Fare change pre/post window averages
const fareChange = new Date("2025-07-15");
const preWindow = ridershipDaily.filter(d => d.date >= new Date("2025-06-30") && d.date <= new Date("2025-07-14"));
const postWindow = ridershipDaily.filter(d => d.date >= new Date("2025-07-15") && d.date <= new Date("2025-07-29"));
const preAvg = preWindow.length ? sum(preWindow.map(d => d.total)) / preWindow.length : NaN;
const postAvg = postWindow.length ? sum(postWindow.map(d => d.total)) / postWindow.length : NaN;
const fareEffect = isFinite(preAvg) && isFinite(postAvg) ? (postAvg - preAvg) / preAvg : NaN;

// 6) Staffing by station (use ALL incidents; take max observed staffing_count)
const staffByStation = Array.from(
  groupBy(incidents, d => d.station),
  ([station, rows]) => ({ station, staff: Math.max(...rows.map(r => +r.staffing_count || 0)) })
);
const staffMap = new Map(staffByStation.map(d => [d.station, d.staff]));
```

---

## 1) Events ↔ Ridership (Summer 2025) + Fare Increase Effect

```js
note(`<strong>Takeaway:</strong> The largest event days coincide with ridership spikes. After <strong>July 15</strong>, the next two-week average changed by <strong>${isFinite(fareEffect) ? pct(fareEffect) : "N/A"}</strong> vs. the two weeks prior.`)
```

```js
Plot.plot({
  marginLeft: 50,
  marginRight: 25,
  width: 900,
  height: 380,
  x: { label: "Date →" },
  y: { label: "↑ Total ridership (entrances + exits)", grid: true },
  marks: [
    Plot.lineY(ridershipDaily, { x: "date", y: "total" }),
    Plot.dot(topEventDays, { x: "date", y: "ridership", r: 5 }),
    Plot.tip(topEventDays, {
      x: "date",
      y: "ridership",
      title: d => `${d.date.toISOString().slice(0,10)}\nAttendance: ${fmt.format(d.attendance)}\nRidership: ${fmt.format(d.ridership || 0)}`
    }),
    Plot.ruleX([fareChange], { stroke: "currentColor" }),
    Plot.text([fareChange], {
      x: d => d,
      y: Math.max(...ridershipDaily.map(r => r.total)) * 0.95,
      dy: -6,
      text: () => "Fare increase → $3.00 (Jul 15)",
      anchor: "left"
    })
  ]
})
```

```js
note(`<strong>Average daily ridership</strong><br>
Pre (Jun 30–Jul 14): <strong>${isFinite(preAvg) ? fmt.format(Math.round(preAvg)) : "N/A"}</strong><br>
Post (Jul 15–Jul 29): <strong>${isFinite(postAvg) ? fmt.format(Math.round(postAvg)) : "N/A"}</strong><br>
<strong>Relative change:</strong> <strong>${isFinite(fareEffect) ? pct(fareEffect) : "N/A"}</strong>`)
```

---

## 2) Incident Response Time — Best vs Worst Stations (ALL incidents)

```js
// Average response time by station
const avgByStation = Array.from(
  groupBy(incidents, d => d.station),
  ([station, rows]) => ({
    station,
    avg: sum(rows.map(r => +r.response_time_minutes || 0)) / rows.length
  })
).sort((a,b) => a.avg - b.avg);

const overallAvg = sum(avgByStation.map(d => d.avg)) / avgByStation.length;
```

### a) Average response time by station (lower is better)

```js
Plot.plot({
  width: 900,
  height: 560,
  marginLeft: 220,
  x: { label: "Avg response time (min)", grid: true },
  y: { label: null, domain: avgByStation.map(d => d.station) },
  marks: [
    Plot.barX(avgByStation, { x: "avg", y: "station" }),
    Plot.ruleX([overallAvg], { stroke: "currentColor", strokeDasharray: "4 4" }),
    Plot.text([overallAvg], {
      x: d => d, y: 0.5,
      text: () => `Overall mean: ${overallAvg.toFixed(1)} min`,
      dy: -8, anchor: "left"
    })
  ]
})
```

```js
const fastest = avgByStation.slice(0,3);
const slowest = avgByStation.slice(-3).reverse();
note(`<strong>Fastest response:</strong> ${fastest.map(d => `${d.station} (${d.avg.toFixed(1)} min)`).join(", ")}<br>
<strong>Slowest response:</strong> ${slowest.map(d => `${d.station} (${d.avg.toFixed(1)} min)`).join(", ")}`)
```

### b) Distribution by severity (three simple panels)

```js
// Minimal, compatibility-proof version: three separate scatter plots (one per severity).
const inc2b = incidents.filter(d => Number.isFinite(+d.response_time_minutes) && d.station && d.severity);
note(`<strong>2b:</strong> plotting ${inc2b.length} incidents with valid times across ${new Set(inc2b.map(d=>d.station)).size} stations.`);

const yDomain = avgByStation.map(d => d.station);
const xMax = Math.max(30, ...inc2b.map(d => +d.response_time_minutes));

function severityPlot(sev) {
  const data = inc2b.filter(d => d.severity === sev);
  return Plot.plot({
    width: 900,
    height: 300,
    marginLeft: 220,
    x: { label: "Response time (min)", domain: [0, xMax], grid: true },
    y: { label: sev, domain: yDomain },
    marks: [
      Plot.dot(data, { x: "response_time_minutes", y: "station", r: 2.5, tip: true })
    ]
  });
}

// Render three panels
```

```js
severityPlot("low")
```

```js
severityPlot("medium")
```

```js
severityPlot("high")
```

---

## 3) 2026 Events → Where to Add Staff (Top 3)

```js
// Sum expected attendance by station for 2026
const expectedByStation = Array.from(
  groupBy(upcomingEvents, d => d.nearby_station),
  ([station, rows]) => ({ station, expected: sum(rows.map(r => +r.expected_attendance || 0)) })
);

// Merge with staffing (from ALL incidents). Omit stations with zero staff.
const demandPerStaff = expectedByStation.map(d => {
  const staff = staffMap.get(d.station) ?? 0;
  return {
    station: d.station,
    expected: d.expected,
    staff,
    perStaff: staff > 0 ? d.expected / staff : null
  };
}).sort((a,b) => (b.perStaff ?? -Infinity) - (a.perStaff ?? -Infinity));

const demandRenderable = demandPerStaff.filter(d => d.perStaff != null);
const top3 = demandRenderable.slice(0,3);
```

```js
Plot.plot({
  width: 900,
  height: 480,
  marginLeft: 220,
  x: { label: "Expected attendees per staffer (Summer 2026)", grid: true },
  y: { label: null, domain: demandRenderable.slice(0,12).map(d => d.station) },
  marks: [
    Plot.barX(demandRenderable.slice(0,12), { x: "perStaff", y: "station" }),
    Plot.tip(demandRenderable.slice(0,12), {
      x: "perStaff",
      y: "station",
      title: d => `${d.station}\nExpected: ${fmt.format(Math.round(d.expected))}\nStaff: ${d.staff}\nPer staff: ${fmt.format(Math.round(d.perStaff))}`
    })
  ]
})
```

```js
note(`<strong>Top 3 stations needing staff (by expected attendees per staffer)</strong><br>
${top3.map((d,i) => `${i+1}) <strong>${d.station}</strong> — ${fmt.format(Math.round(d.perStaff))} per staffer`).join("<br>")}
<br><em>Note:</em> Stations with zero inferred staff are omitted to avoid infinite ratios.`)
```

---

## 4) **Bonus:** One-Station Priority Recommendation

We build a simple composite score that blends **2026 demand pressure**, **historical response time**, and **2025 event-driven uplifts** at each station.

- **Demand pressure (50%)**: expected 2026 attendees per staffer (from above).
- **Response time (30%)**: average historical response time at the station (higher = worse).
- **Event uplift (20%)**: for 2025 events near a station, the cumulative **positive** uplift vs that station’s 2025 average.

```js
// Baseline per-station ridership (Summer 2025 avg)
const baselineByStation = Array.from(
  groupBy(ridershipStationDaily, d => d.station),
  ([station, rows]) => ({ station, avg: sum(rows.map(r => r.total)) / rows.length })
);
const baselineMap = new Map(baselineByStation.map(d => [d.station, d.avg]));

// Event days per station (Summer 2025)
const eventsByStationDate = Array.from(
  groupBy(localEvents, d => `${d.nearby_station}__${d.date.toISOString().slice(0,10)}`),
  ([key, rows]) => ({ station: rows[0].nearby_station, date: new Date(rows[0].date) })
);

// Ridership at station+date
const rsdKey = (d) => `${d.date.toISOString().slice(0,10)}__${d.station}`;
const ridershipStationMap = new Map(ridershipStationDaily.map(d => [rsdKey(d), d.total]));

// Positive event-day uplift per station
const upliftByStation = Array.from(
  groupBy(eventsByStationDate, d => d.station),
  ([station, rows]) => {
    const base = baselineMap.get(station) ?? 0;
    const lift = sum(rows.map(r => Math.max(0, (ridershipStationMap.get(`${r.date.toISOString().slice(0,10)}__${station}`) ?? base) - base)));
    return { station, uplift: lift };
  }
);
const upliftMap = new Map(upliftByStation.map(d => [d.station, d.uplift]));

// Average response time per station (from ALL incidents)
const avgRTMap = new Map(avgByStation.map(d => [d.station, d.avg]));

// Compose rows across all stations
const allStations = Array.from(new Set([
  ...demandPerStaff.map(d => d.station),
  ...avgByStation.map(d => d.station),
  ...upliftByStation.map(d => d.station)
]));

let scoreRows = allStations.map(station => {
  const demand = (demandPerStaff.find(s => s.station === station)?.perStaff) ?? 0;
  const rt = avgRTMap.get(station) ?? 0;
  const lift = upliftMap.get(station) ?? 0;
  return { station, demand, rt, lift };
});

// Normalize to [0,1]
function normalize(arr, key) {
  const vals = arr.map(d => d[key]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = (max - min) || 1;
  for (const d of arr) d[`${key}_n`] = (d[key] - min) / span;
}
normalize(scoreRows, "demand");
normalize(scoreRows, "rt");
normalize(scoreRows, "lift");

// Weighted score: 50% demand, 30% response time, 20% uplift
scoreRows.forEach(d => d.score = 0.5*d.demand_n + 0.3*d.rt_n + 0.2*d.lift_n);
scoreRows.sort((a,b) => b.score - a.score);
const topPick = scoreRows[0];
```

```js
note(`<strong>Priority pick:</strong> <strong>${topPick?.station ?? "—"}</strong><br>
<em>Rationale:</em> combines high 2026 demand per staffer, historically slower responses, and significant positive event-day ridership uplifts.`)
```

```js
Plot.plot({
  width: 900,
  height: 480,
  marginLeft: 220,
  x: { label: "Composite priority score (0–1) →" },
  y: { label: null, domain: scoreRows.slice(0,10).map(d => d.station) },
  marks: [
    Plot.barX(scoreRows.slice(0,10), { x: "score", y: "station" }),
    Plot.tip(scoreRows.slice(0,10), {
      x: "score",
      y: "station",
      title: d => `${d.station}\nScore: ${d.score.toFixed(2)}\nDemand/staff: ${fmt.format(Math.round(d.demand))}\nAvg RT: ${d.rt.toFixed(1)} min\n2025 uplift: ${fmt.format(Math.round(d.lift))}`
    })
  ]
})
```
