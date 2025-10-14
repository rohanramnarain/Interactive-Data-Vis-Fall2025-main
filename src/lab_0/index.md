---
title: Lab 0 Work — Rohan R.
toc: false
---

# Lab 0 Work
by Rohan R.

_**Beginning of Interactive Data Visualization Labs**_

## Learning Goals
This page demonstrates the required pieces: **Markdown** headers & text, **HTML** table/list/image, and **JavaScript** inputs that update visible text.

<!-- Minimal styles -->
<style>
  :root { --maxw: 920px; }
  body { line-height: 1.6; }
  .page { max-width: var(--maxw); margin: 0 auto; padding: 1.5rem 1rem; }
  table { width:100%; border-collapse: collapse; margin:.75rem 0 1.25rem; font-size:.95rem; }
  th, td { border:1px solid #e6e6e6; padding:.55rem .6rem; vertical-align: top; }
  th { background:#fafafa; text-align:left; }
  .hero { width:100%; border-radius:12px; display:block; margin:.5rem 0 1rem; }
  .card { border:1px solid #eee; border-radius:12px; padding:1rem; margin:1rem 0; }
  .label { display:block; font-weight:600; margin-bottom:.25rem; }
  .welcome { font-size:1.1rem; font-weight:700; margin-top:.5rem; }
  .kpi { font:700 1.2rem/1.2 system-ui, sans-serif; }
  input[type="text"], input[type="range"] { width:100%; max-width:420px; padding:.6rem .7rem; border:1px solid #ddd; border-radius:10px; }
  iframe { width:100%; border:0; border-radius:12px; }
</style>

<div class="page">

<!-- HTML IMAGE -->
<img class="hero" src="./assets/fork.png" alt="Interactive Data Visualization banner" />

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

## Mini Dashboard (JS inputs → visible change)

<div class="card">
  <label for="your-name" class="label">Enter your name</label>
  <input id="your-name" type="text" placeholder="e.g., Rohan R." />
  <div id="welcome" class="welcome">Welcome to Interactive Data Visualization</div>
</div>

<div class="card">
  <label for="progress" class="label">Set your completion %</label>
  <input id="progress" type="range" min="0" max="100" value="30" />
  <div class="kpi">Completion: <span id="pct">30%</span></div>
</div>

### Sample Interactive Visualization (Tableau)
<!-- Replace src with your Tableau Public embed URL -->
<div class='tableauPlaceholder' id='viz1760485725333' style='position: relative'><noscript><a href='#'><img alt=' ' src='https:&#47;&#47;public.tableau.com&#47;static&#47;images&#47;Da&#47;DataViz_StudioCritique_March11_Viz3&#47;HeatMap_NoiseBarkingDog_NYC_2010to2025&#47;1_rss.png' style='border: none' /></a></noscript><object class='tableauViz'  style='display:none;'><param name='host_url' value='https%3A%2F%2Fpublic.tableau.com%2F' /> <param name='embed_code_version' value='3' /> <param name='site_root' value='' /><param name='name' value='DataViz_StudioCritique_March11_Viz3&#47;HeatMap_NoiseBarkingDog_NYC_2010to2025' /><param name='tabs' value='yes' /><param name='toolbar' value='yes' /><param name='static_image' value='https:&#47;&#47;public.tableau.com&#47;static&#47;images&#47;Da&#47;DataViz_StudioCritique_March11_Viz3&#47;HeatMap_NoiseBarkingDog_NYC_2010to2025&#47;1.png' /> <param name='animate_transition' value='yes' /><param name='display_static_image' value='yes' /><param name='display_spinner' value='yes' /><param name='display_overlay' value='yes' /><param name='display_count' value='yes' /><param name='language' value='en-US' /></object></div>                <script type='text/javascript'>                    var divElement = document.getElementById('viz1760485725333');                    var vizElement = divElement.getElementsByTagName('object')[0];                    vizElement.style.width='100%';vizElement.style.height=(divElement.offsetWidth*0.75)+'px';                    var scriptElement = document.createElement('script');                    scriptElement.src = 'https://public.tableau.com/javascripts/api/viz_v1.js';                    vizElement.parentNode.insertBefore(scriptElement, vizElement);                </script>

<!-- Plain JS to wire the inputs -->
<script>
(function () {
  // Name input -> welcome line (+ persist)
  const nameInput = document.getElementById("your-name");
  const welcome = document.getElementById("welcome");
  const saved = localStorage.getItem("lab0_name");
  if (saved) {
    nameInput.value = saved;
    welcome.textContent = `Welcome to Interactive Data Visualization, ${saved}!`;
  }
  nameInput.addEventListener("input", function () {
    const v = this.value.trim();
    if (v) {
      welcome.textContent = `Welcome to Interactive Data Visualization, ${v}!`;
      localStorage.setItem("lab0_name", v);
    } else {
      welcome.textContent = "Welcome to Interactive Data Visualization";
      localStorage.removeItem("lab0_name");
    }
  });

  // Range input -> KPI %
  const range = document.getElementById("progress");
  const pct = document.getElementById("pct");
  const setPct = (v) => pct.textContent = v + "%";
  setPct(range.value);
  range.addEventListener("input", () => setPct(range.value));
})();
</script>

</div>
