# CoWEDA — Running with Backend

## Setup

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

## Running (Development)

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend**
```bash
npm run dev
# Runs on http://localhost:5173
```

Then open http://localhost:5173 in your browser.

## Architecture

```
CoWEDA-web/
├── src/                     # React frontend
│   ├── context/
│   │   └── AuthContext.jsx  # JWT auth state & API helpers
│   ├── hooks/
│   │   ├── useClothingData.js  # Fetches CIEdata from backend
│   │   └── useEnsembles.js     # CRUD for user ensembles
│   └── components/
│       └── LoginModal.jsx   # Login / Register modal
└── backend/
    ├── server.js            # Express API
    ├── CIEdata.csv          # Clothing insulation data (served via API)
    └── coweda.db            # SQLite database (auto-created)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, get JWT |
| GET | `/api/clothing-data` | ✓ | Serve CIEdata.csv |
| GET | `/api/ensembles` | ✓ | List user's ensembles |
| POST | `/api/ensembles` | ✓ | Create ensemble |
| PUT | `/api/ensembles/:id` | ✓ | Update ensemble |
| DELETE | `/api/ensembles/:id` | ✓ | Delete ensemble |

## Notes

- JWTs expire after 7 days.
- On first registration, the three default ensembles (Default Ensemble, Arctic Kit, Light Layer) are automatically seeded for the new user.
- The SQLite database (`coweda.db`) is created automatically in the `backend/` folder on first run.
- For production, set `JWT_SECRET` to a strong random string and `MONGO_URI` to your MongoDB connection string (e.g. a MongoDB Atlas URI).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/coweda` | MongoDB connection string |
| `JWT_SECRET` | `coweda-dev-secret-...` | Secret for signing JWTs — **change in production** |
| `PORT` | `3001` | Backend port |

For MongoDB Atlas, set `MONGO_URI` to your Atlas connection string, e.g.:
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/coweda
```
