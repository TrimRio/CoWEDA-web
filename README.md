# CoWEDA Dashboard

The Cold Weather Ensemble Decision Aid web application (CoWEDA-web) simulates human thermoregulation using the Six Cylinder Thermoregulation Model (SCTM) and user input for environmental conditions, activity level, and selected clothing ensembles. This web application is built with React + Vite.

## Project Structure

```
CoWEDA-web/
├── index.html                        # HTML entry point
├── vite.config.js                    # Vite build config
├── .env                              # Local environment variables (not committed)
├── .env.example                      # Example env file (VITE_OWM_KEY for weather)
├── public/
│   ├── CIEdata.csv                   # Clothing item database (insulation, weight, zone, image refs)
│   └── clothing/                     # Clothing item thumbnail images (referenced by CIEdata.csv)
└── src/
    ├── main.jsx                      # App entry point — mounts React, imports CSS
    ├── App.jsx                       # Root component: layout, global state, PSDA orchestration
    ├── styles.css                    # All global CSS
    ├── components/
    │   ├── Chips.jsx                 # Pill-button toggle group (e.g. Rest / Active mode)
    │   ├── ClothingModal.jsx         # Per-zone clothing picker modal with item cards and selected list
    │   ├── DetailsPlot.jsx           # Recharts line graph of skin/core temps over simulation time
    │   ├── EnsembleControls.jsx      # Ensemble save / load / rename / delete controls
    │   ├── HelpDrawer.jsx            # Slide-in help/documentation drawer
    │   ├── Silhouette.jsx            # SVG body figure with clickable zones and clo overlays
    │   ├── Slider.jsx                # Range slider with colored gradient track
    │   └── WeatherModal.jsx          # Live weather import via OpenWeatherMap API
    ├── data/
    │   ├── constants.js              # App-wide constants: activity MET values, risk thresholds,
    │   │                             #   zone labels/order, risk color/badge helpers
    │   └── ensembles.js              # Default ensemble definitions (Default, Arctic Kit, Light Layer)
    ├── hooks/
    │   ├── useClothingData.js        # Fetches + parses CIEdata.csv; exposes items and byZone map
    │   └── usePSDA.js                # Runs PSDA simulation reactively; returns risk results + plot data
    └── utils/
        ├── clothingCalculations.js   # Aggregates selected items into RH2/PIM2 resistance arrays
        ├── unitConversions.js        # SI ↔ display unit helpers (°C/°F, m/s / mph)
        └── psda/
            ├── PSDACalculator.js     # Core PSDA simulation engine (time-stepped thermoregulation model)
            ├── PSDACalculatorInput.js  # Input struct for the PSDA calculator
            ├── PSDACalculatorOutput.js # Output struct (skin temps, core temp, survival time, etc.)
            └── PSDAHelpers.js        # Math helpers: DuBois BSA, vapour pressure, sech, BMI

```

### Key Data Flow

1. `useClothingData` loads `CIEdata.csv` and groups items by body zone.
2. The user selects clothing items per zone via `ClothingModal` (or loads a preset from `ensembles.js`).
3. `clothingCalculations.js` aggregates selected items into zone-level thermal resistance arrays.
4. `usePSDA` feeds those values plus environmental inputs (temp, wind, humidity, activity) into `PSDACalculator` and returns risk status and time-series data.
5. `App.jsx` renders risk badges, the `Silhouette` overlay, and the `DetailsPlot` chart from those results.

## Environment Variables

Copy `.env.example` to `.env` and fill in your key:

```
VITE_OWM_KEY=your_openweathermap_api_key
```

The weather import feature (`WeatherModal`) requires a free [OpenWeatherMap](https://openweathermap.org/api) API key. All other features work without it.

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy that folder to any static host (Netlify, Vercel, GitHub Pages, etc.).
