---
title: "Lab 1: Passing Pollinators"
toc: true
---

This page is where you can iterate. Follow the lab instructions in the [readme.md](./README.md).

<!-- ```js
const text = view(Inputs.text())
```
This is the value of text: ${text} -->

```js
Plot.plot({
    width: 300,
    height: 200,
    marks: [
        Plot.frame(),
        Plot.text(["text"], {frameAnchor: "middle", rotate: 90})
    ]
})
```

```js
// view(aapl)
Inputs.table(aapl)
```

```js
Plot.plot({
 
    height: 200,
    y: {
        grid: true
    },
    marks: [
        Plot.frame(),
        Plot.line(aapl, { x: "Date", y: "Close", stroke: "pink", strokeWidth: 20}),
        Plot.dot(aapl, { x: "Date", y: "Close", tip: true, r: 1, fill: "white"}),
        // Plot.line(goog, { x: })


    ]
})