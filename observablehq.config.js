// See https://observablehq.com/framework/config for documentation.
export default {
  // The app’s title; used in the sidebar and webpage titles.
  title: "Interactive Data Visualization (Fall 2025)",

  // The pages and sections in the sidebar. If you don’t specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  pages: [
    {
      name: "Lab 0: Getting Started",
      open: false,
      pages: [
        { name: "Instructions", path: "/lab_0/readme" },
        { name: "Dashboard", path: "/lab_0/index" },
      ],
    },
    {
      name: "Lab 1: Prolific Pollinators",
      open: false,
      pages: [
        { name: "Instructions", path: "/lab_1/readme" },
        { name: "Dashboard", path: "/lab_1/index" },
      ],
    },
      {
      name: "Lab 2: Subway Staffing",
      open: false,
      pages: [
        { name: "Instructions", path: "/lab_2/readme" },
        { name: "Dashboard", path: "/lab_2/index" },
      ],
    },
    {
      name: "Lab 3: Mayoral Mystery",
      open: true,
      pages: [
        { name: "Instructions", path: "/lab_3/readme" },
        { name: "Dashboard", path: "/lab_3/index" },
      ],
    },
    {
      name: "Lab 4: Clearwater Crisis",
      open: true,
      pages: [
        { name: "Instructions", path: "/lab_4/readme" },
        { name: "Dashboard", path: "/lab_4/index" },
      ],
    }

  ],

  // Content to add to the head of the page, e.g. for a favicon:
  head: '<link rel="icon" href="observable.png" type="image/png" sizes="32x32">',

  // The path to the source root.
  root: "src",

  // Some additional configuration options and their defaults:
  // theme: "default", // try "light", "dark", "slate", etc.
  // header: "", // what to show in the header (HTML)
  // footer: "Built with Observable.", // what to show in the footer (HTML)
  // sidebar: true, // whether to show the sidebar
  // toc: true, // whether to show the table of contents
  // pager: true, // whether to show previous & next links in the footer
  // output: "dist", // path to the output root for build
  // search: true, // activate search
  // linkify: true, // convert URLs in Markdown to links
  // typographer: false, // smart quotes and other typographic improvements
  // preserveExtension: false, // drop .html from URLs
  // preserveIndex: false, // drop /index from URLs
};
