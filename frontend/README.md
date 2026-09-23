# Cyber Fraud Command Center — Dashboard (Version 1)

A frontend-only React + Vite dashboard shell for an AI-powered ATM/cyber fraud
investigation system. All data is dummy/static — there is no backend, no
authentication, and no real fraud detection. This is just the UI shell.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Project structure

```
src/
├── components/       # One file per dashboard section
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── StatCard.jsx
│   ├── ActiveCases.jsx
│   ├── HighRiskATMs.jsx
│   ├── CityHeatmap.jsx
│   ├── ATMRiskOverview.jsx
│   └── RecentCases.jsx
├── data/
│   └── dashboardData.js   # All dummy data lives here
├── App.jsx            # Assembles the layout from the components above
├── App.css            # All styling (colors, layout, responsive rules)
└── main.jsx            # React entry point
```

## How to modify things

- **Change the numbers:** edit `src/data/dashboardData.js`. Every component
  reads from this file, so you only need to change data in one place.
- **Change colors:** edit the CSS variables at the top of `src/App.css`
  (e.g. `--color-navy`, `--color-blue`, `--color-red`).
- **Add a new sidebar page:** add an entry to the `NAV_ITEMS` array in
  `src/components/Sidebar.jsx`, then decide what to render for it in
  `App.jsx` based on `activePage`.
- **Swap the heatmap for a real map:** `CityHeatmap.jsx` is self-contained —
  you can replace its internals with a real map library later without
  touching anything else.

## What's intentionally NOT included (Version 1 scope)

- Real authentication
- Real database or API calls
- Real ATM / fraud / suspect data
- Any real ML/fraud-detection logic

This is a UI shell meant to be built on top of later.
