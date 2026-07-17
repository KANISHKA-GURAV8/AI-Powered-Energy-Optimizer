# ⚡ AI Powered Energy Consumption Optimizer
### MERN Stack Project — Full Documentation

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
└── server/                    # Node.js + Express Backend
    ├── models/
    │   ├── User.js                ← Mongoose User schema (bcrypt)
    │   └── EnergyLog.js           ← Daily kWh consumption logs
    ├── routes/
    │   ├── auth.js                ← POST /login, POST /register
    │   └── energy.js              ← GET /weather, /logs, /dashboard
    ├── middleware/
    │   └── authMiddleware.js      ← JWT protect() middleware
    ├── index.js                   ← Express server entry
    ├── seed.js                    ← Demo data seeder
    └── .env                       ← PORT, MONGO_URI, JWT_SECRET, WEATHER_KEY
```

---

## 🚀 How to Run

### Step 1 — Get OpenWeatherMap API Key (FREE)
1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for free → copy your API key
3. Paste it into both `.env` files:
   - `server/.env` → `OPENWEATHER_API_KEY=your_key_here`
   - `client/.env` → `VITE_OPENWEATHER_API_KEY=your_key_here`

### Step 2 — Install MongoDB
- Download: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- Start MongoDB service (runs on `mongodb://localhost:27017`)

### Step 3 — Start Backend
```bash
cd server
npm install
node index.js
# Server runs on http://localhost:5000
```

### Step 4 — (Optional) Seed demo data
```bash
cd server
node seed.js
# Login: demo@energy.com / password123
```

### Step 5 — Start Frontend
```bash
cd client
npm run dev
# App runs on http://localhost:5173
```

### Step 6 — Open App
Go to: **http://localhost:5173**

> **💡 Demo Mode**: If MongoDB is not running, you can still sign up/login and the dashboard shows demo data automatically.

---

## 🏗️ MERN Architecture (For Project Explanation)

```
React (Vite)                Express.js              MongoDB
─────────────               ──────────              ───────
Login Page      →  POST /api/auth/register  →  User.save()
                ←  { name, token, city }   ←  bcrypt hash pw

Dashboard       →  GET /api/energy/weather →  fetch OpenWeatherMap
                ←  { temp, humidity, wind }←  real-time response

                →  GET /api/energy/logs    →  EnergyLog.find()
                ←  [ {date, kWh} × 7 ]    ←  last 7 days

Recharts        →  AreaChart data          ←  formatted array
WeatherWidget   ←  live weather data
StatCards       ←  aggregated stats
```

### Key Concepts Used:
| Concept | Where Used |
|---------|-----------|
| **JWT Authentication** | `authMiddleware.js` — `jwt.sign()` + `jwt.verify()` |
| **bcrypt Password Hashing** | `User.js` pre-save hook |
| **React Context API** | `AuthContext.jsx` — global auth state |
| **Axios Interceptors** | `api.js` — auto-attach JWT to all requests |
| **Mongoose ODM** | `User.js`, `EnergyLog.js` — schema + model |
| **Recharts AreaChart** | `Dashboard.jsx` — gradient area chart |
| **OpenWeatherMap API** | `energy.js` route + `Dashboard.jsx` |
| **React Router v6** | `App.jsx` — protected routes |

---

## 🌤️ Real-Time Weather API
- Provider: [OpenWeatherMap](https://openweathermap.org/) (free tier: 60 calls/min)
- Endpoint: `GET /data/2.5/weather?q={city}&appid={key}&units=metric`
- Used in: `server/routes/energy.js` → `/api/energy/weather`
- Dashboard shows: Temperature, Feels Like, Humidity %, Wind speed (km/h)
- Weather icon codes (`01d`, `02d` etc.) mapped to emoji in `Dashboard.jsx`

---

## 📊 Dashboard Features

| Widget | Data Source |
|--------|-------------|
| Units Consumed Today | `EnergyLog` collection (today's entry) |
| Current Cost (₹) | units × ₹5/kWh tariff |
| Predicted Monthly Bill | avg daily × 30 × tariff |
| Units Saved | comparison vs yesterday's log |
| Energy Trend Chart | Recharts `AreaChart` with last 7 log entries |
| Weather Widget | OpenWeatherMap real-time API |
| Active Tariff Box | Static ₹8/kWh peak hours display |

---

## 🔐 Authentication Flow
```
1. User fills signup form → POST /api/auth/register
2. Server: bcrypt hashes password → saves to MongoDB
3. Server: signs JWT (7 day expiry) → returns to client
4. Client: stores token in localStorage
5. All subsequent requests: axios interceptor adds "Authorization: Bearer <token>"
6. Protected routes: authMiddleware.js verifies JWT → attaches req.user
```
