# CoWEDA-web

The Cold Weather Ensemble Decision Aid web application (CoWEDA-web) simulates human thermoregulation using the Six 
Cylinder Thermoregulation Model (SCTM) based on user inputs for environmental conditions, activity level, and selected 
clothing ensembles. The application follows a client-server architecture, with a React and Vite frontend handling the 
user interface and SCTM calculations, and a Node.js and Express backend providing authenticated API endpoints for 
clothing data and user ensemble management, with ensemble data persisted in a MongoDB database.

## Project Structure

```
src/
├── main.jsx                  # App entry point — mounts React, imports CSS
├── App.jsx                   # Main layout and state management
├── styles.css                # All global CSS (extracted from original HTML)
├── data/
│   └── constants.js          # Static data: ACTIVITIES, CLOTHING_DB, ZONES_RISK, etc.
└── components/
    ├── Slider.jsx             # Range slider with colored track
    ├── Chips.jsx              # Pill-button toggle group
    ├── EnsembleControls.jsx   # Ensemble select / rename / delete
    ├── Silhouette.jsx         # SVG body figure with clickable zones
    └── ClothingModal.jsx      # Zone clothing picker modal
```

## updated structure
```
CoWEDA-web/
├── index.html                        # HTML entry point
├── vite.config.js                    # Vite build config — includes /api proxy to backend (port 3001)
├── .env                              # Local environment variables (not committed)
├── .env.example                      # Example env file (VITE_OWM_KEY for weather)
├── BACKEND_README.md                 # Backend setup and API documentation
├── public/
│   └── clothing/                     # Clothing item thumbnail images (referenced by CIEdata.csv)
├── backend/
│   ├── server.js                     # Express REST API — auth, ensembles, and CIEdata endpoints
│   ├── CIEdata.csv                   # Clothing item database (moved from public/ — now served via API)
│   └── package.json                  # Backend dependencies: express, mongoose, bcryptjs, jsonwebtoken
└── src/
    ├── main.jsx                      # App entry point — mounts React, wraps app in AuthProvider
    ├── App.jsx                       # Root component: layout, global state, PSDA orchestration
    ├── styles.css                    # All global CSS
    ├── components/
    │   ├── Chips.jsx                 # Pill-button toggle group (e.g. Rest / Active mode)
    │   ├── ClothingModal.jsx         # Per-zone clothing picker modal with item cards and selected list
    │   ├── DetailsPlot.jsx           # Recharts line graph of skin/core temps over simulation time
    │   ├── EnsembleControls.jsx      # Ensemble save / load / rename / delete controls
    │   ├── HelpDrawer.jsx            # Slide-in help/documentation drawer
    │   ├── LoginModal.jsx            # Sign in / register modal with toggle between modes
    │   ├── Silhouette.jsx            # SVG body figure with clickable zones and clo overlays
    │   ├── Slider.jsx                # Range slider with colored gradient track
    │   └── WeatherModal.jsx          # Live weather import via OpenWeatherMap API
    ├── context/
    │   └── AuthContext.jsx           # JWT auth state — login, register, logout, token persistence
    ├── data/
    │   ├── constants.js              # App-wide constants: activity MET values, risk thresholds,
    │   │                             #   zone labels/order, risk color/badge helpers
    │   └── ensembles.js              # Default ensemble definitions (kept as fallback reference)
    ├── hooks/
    │   ├── useClothingData.js        # Fetches + parses CIEdata.csv from backend API; exposes items
    │   │                             #   and byZone map; re-fetches reactively on auth token change
    │   ├── useEnsembles.js           # CRUD for user ensembles via backend API; re-fetches on login
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




## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. You can deploy that folder to any static host (Netlify, Vercel, GitHub Pages, etc.).
