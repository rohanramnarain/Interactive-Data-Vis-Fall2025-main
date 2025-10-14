---
title: Lab 0 Work — Rohan R.
toc: false
---

# Lab 0 Work
by Rohan R.

_**Beginning of Interactive Data Visualization Labs**_

## Learning Goals
This page shows a complete example using **Markdown**, **HTML**, and **Observable JS** in one file.

<style>
  :root { --maxw: 920px; }
  .page { max-width: var(--maxw); margin: 0 auto; padding: 1.5rem 1rem; line-height: 1.6; }
  table { width:100%; border-collapse: collapse; margin:.75rem 0 1.25rem; font-size:.95rem; }
  th, td { border:1px solid #e6e6e6; padding:.55rem .6rem; vertical-align: top; }
  th { background:#fafafa; text-align:left; }
  .hero { width:100%; border-radius:12px; display:block; margin:.5rem 0 1rem; }
  .kpi { font:700 1.2rem/1.2 system-ui, sans-serif; }
  iframe { width:100%; border:0; border-radius:12px; }
</style>

<div class="page">

<!-- HTML IMAGE -->
<img class="hero" src="./assets/pages.png" alt="Interactive Data Visualization banner" />

### Tracking Progress (HTML Table)
<table>
  <thead><tr><th>Goals</th><th>Progress</th></tr></thead>
  <tbody>
    <tr><td>Working with Git, GitHub, Observable framework</td><td>Initiated work in Class 3</td></tr>
    <tr><td>Learning HTML, CSS, JS</td><td>Initiated work in Class 4</td></tr>
    <tr><td>Complete Lab 0</td><td>Deadline set for Class 5</td></tr>
  </tbody>
</table>

### Challenges (HTML List)
<ul>
  <li>Understanding the tools</li>
  <li>Grasping the concepts behind visualizations</li>
  <li>Deciphering the code</li>
  <li>Not getting lost in the details</li>
</ul>

## Mini Dashboard (inputs → visible changes)

```js

import { Inputs } from "@observablehq/inputs";
Copy code
viewof name = Inputs.text({
  label: "Enter your name",
  placeholder: "e.g., Rohan R."
})

md`**Welcome to Interactive Data Visualization${name ? `, ${name}` : ""}!**`

viewof progress = Inputs.range([0, 100], {
  value: 30,
  step: 1,
  label: "Set your completion %"
})

md`Completion: <span class="kpi">${progress}%</span>`
