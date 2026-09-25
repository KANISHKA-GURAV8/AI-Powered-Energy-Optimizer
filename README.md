# ⚡ AI Powered Energy Consumption Optimizer
### Python Flask + React Project — Full Documentation

---

## 🗂️ Project Structure
```
Major_Project/
├── client/                    # React + Vite Frontend
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx    ← Global JWT auth state
│   │   ├── services/
│   │   │   └── api.js             ← Axios instance + JWT interceptor
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        ← Navigation sidebar
│   │   │   └── PrivateRoute.jsx   ← Route guard (requires JWT)
│   │   ├── pages/
│   │   │   ├── Login.jsx          ← Login / Signup page
│   │   │   ├── Login.css
│   │   │   ├── Dashboard.jsx      ← Main dashboard (⭐ Key page)
│   │   │   └── Dashboard.css
│   │   ├── App.jsx                ← Router + layouts
│   │   ├── main.jsx               ← React entry point
│   │   └── index.css              ← Global design system
│   └── .env                       ← VITE_API_BASE_URL, OPENWEATHER_KEY
│
└── server/                    # Python + Flask Backend
    ├── ml/                        # Machine Learning Models
    │   ├── predict.py             ← ML Prediction Logic
    │   ├── recommend.py           ← AI Recommendations
    │   └── models/                ← Serialized Scikit-Learn models
    ├── routes/
    │   ├── auth.py                ← POST /api/auth/login, /register
    │   ├── energy.py              ← GET /api/energy/weather, /logs, /dashboard
    │   ├── appliances.py          ← CRUD operations for appliances
    │   └── middleware.py          ← JWT protection & helpers
    ├── app.py                     ← Flask server entry & config
    ├── build_features.py          ← Data processing for ML
    ├── generate_reason.py         ← Recommendation logic
    ├── requirements.txt           ← Python dependencies
    └── .env                       ← PORT, MONGO_URI, JWT_SECRET, OPENWEATHER_API_KEY
```

---

## 🚀 How to Run

### Step 1 — Database and API Setup
1. **OpenWeatherMap**: Go to [OpenWeatherMap](https://openweathermap.org/api), sign up, get your free API key.
2. **MongoDB**: Have a local MongoDB running (`mongodb://localhost:27017`) OR a cloud Atlas cluster.
3. Paste these credentials into both `.env` files:
   - `server/.env` → `OPENWEATHER_API_KEY` and `MONGO_URI`
   - `client/.env` → `VITE_OPENWEATHER_API_KEY` (if used directly by frontend)

### Step 2 — Start Backend (Python/Flask)
Open a terminal and run:
```bash
cd server
python -m venv venv           # Optional: Create virtual environment
.\venv\Scripts\activate       # Optional: Activate it (Windows)
pip install -r requirements.txt
python app.py
# Server runs on http://localhost:5000
```

### Step 3 — Start Frontend (React/Vite)
Open a **second** terminal and run:
```bash
cd client
npm install
npm run dev
# App runs on http://localhost:5173
```

### Step 4 — Open App
Go to: **http://localhost:5173**

---

## 🏗️ Architecture (React + Flask + MongoDB + ML)

```
React (Vite)                Flask (Python)          MongoDB / ML Models
─────────────               ──────────────          ───────────────────
Login Page      →  POST /api/auth/register  →  PyMongo insert()
                ←  { token, user }         ←  bcrypt hash pw

Dashboard       →  GET /api/energy/weather →  fetch OpenWeatherMap API
                ←  { temp, humidity, ... } ←  real-time response

                →  GET /api/energy/logs    →  PyMongo find()
                ←  [ {date, kWh} × 7 ]    ←  last 7 days

ML Predictions  →  POST /api/energy/recommendations → Scikit-Learn Model predict()
                ←  [ recommendations ]     ← AI output based on data
```

### Key Concepts Used:
| Concept | Where Used |
|---------|-----------|
| **JWT Authentication** | `Flask-JWT-Extended` — `create_access_token()` + `@jwt_required()` |
| **Password Hashing** | `bcrypt` python library in `auth.py` |
| **React Context API** | `AuthContext.jsx` — global auth state |
| **Axios Interceptors** | `api.js` — auto-attach JWT to all requests |
| **PyMongo Database** | `auth.py`, `energy.py` — native MongoDB queries |
| **Machine Learning** | `Scikit-Learn`, `Pandas` for energy predictions and insights |
| **Recharts AreaChart** | `Dashboard.jsx` — gradient area chart |
| **OpenWeatherMap API** | `energy.py` route |

---

## 🌤️ Real-Time Weather API
- Provider: [OpenWeatherMap](https://openweathermap.org/) (free tier)
- Endpoint: `GET /data/2.5/weather?q={city}&appid={key}&units=metric`
- Used in: `server/routes/energy.py` → `/api/energy/weather`
- Dashboard shows: Temperature, Feels Like, Humidity %, Wind speed (km/h)

---

## 📊 Dashboard Features

| Widget | Data Source |
|--------|-------------|
| Units Consumed Today | PyMongo query for today's logs |
| Current Cost (₹) | units × standard tariff |
| Predicted Monthly Bill | ML predictions & aggregations |
| Energy Trend Chart | Recharts `AreaChart` with last 7 log entries |
| Weather Widget | OpenWeatherMap real-time API via Flask |
| Recommendations | Flask backend parsing ML `predict.py` logic |

---

## 🔐 Authentication Flow
```
1. User fills signup form → POST /api/auth/register
2. Server (Flask): bcrypt hashes password → PyMongo saves to MongoDB
3. Server (Flask): Flask-JWT-Extended signs JWT → returns to client
4. Client (React): stores token in localStorage
5. All subsequent requests: Axios interceptor adds "Authorization: Bearer <token>"
6. Protected routes: @jwt_required() decorator verifies JWT in Flask routes
```
