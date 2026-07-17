# 🚀 HOW TO RUN — AI Energy Optimizer (MERN Stack)

---

## Why login is failing right now?

The error happens because the **backend server (Express) is not running**.
The frontend (React) tries to contact `http://localhost:5000` but nothing is there.

You need **2 things** before login works:
1. ✅ A MongoDB database (use free cloud Atlas — no installation!)
2. ✅ The backend server running

---

## STEP 1 — Set up Free MongoDB Atlas (5 minutes, no installation)

**MongoDB Atlas is a free cloud database. No need to install anything on your PC.**

1. Go to: **https://www.mongodb.com/atlas/database**

2. Click **"Try Free"** → sign up with Google or email

3. Choose the **FREE (M0 Sandbox)** tier → select any region → click **"Create"**

4. **Set up access:**
   - Under **"Security" → "Database Access"** → click **"Add New Database User"**
   - Username: `energyuser`
   - Password: `energy123` (or anything you choose)
   - Role: **Atlas admin**
   - Click **"Add User"**

5. **Allow all IPs:**
   - Under **"Security" → "Network Access"** → click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** → click **"Confirm"**

6. **Get your connection string:**
   - Click **"Database"** in the left menu → click **"Connect"** on your cluster
   - Choose **"Drivers"**
   - Copy the connection string (looks like):
     ```
     mongodb+srv://energyuser:<password>@cluster0.abc12.mongodb.net/?retryWrites=true
     ```

7. **Paste it into `server/.env`:**
   - Open file: `server/.env`
   - Replace the `MONGO_URI` line:
     ```
     MONGO_URI=mongodb+srv://energyuser:energy123@cluster0.abc12.mongodb.net/energy_optimizer
     ```
   - Replace `energy123` with your actual password
   - Replace `cluster0.abc12` with your actual cluster name from Atlas

---

## STEP 2 — Start the Backend Server

Open a terminal (PowerShell or CMD):

```
cd C:\Users\kanis\OneDrive\Desktop\Major_Project\server
npm start
```

**You should see:**
```
✅ MongoDB connected
🚀 Server running on http://localhost:5000
```

> If you see an error, double-check your MONGO_URI in server/.env

---

## STEP 3 — Start the Frontend (open a second terminal)

```
cd C:\Users\kanis\OneDrive\Desktop\Major_Project\client
npm run dev
```

**You should see:**
```
VITE ready
➜ Local: http://localhost:5173/
```

---

## STEP 4 — Open the App & Sign Up

1. Open browser → go to: **http://localhost:5173**
2. Click **"Sign Up"** tab
3. Enter your real details:
   - **Name:** Your name (e.g. Kanis)
   - **Email:** your email (e.g. kanis@gmail.com)
   - **Password:** min 6 characters
   - **City:** Bangalore (for live weather)
4. Click **"Create Account"**
5. You'll be taken to the Dashboard ✅

**Next time** → just use **Login** with the same email + password.

---

## Quick Reference

| Action | Command | Terminal |
|--------|---------|----------|
| Start backend | `npm start` | `server/` folder |
| Start frontend | `npm run dev` | `client/` folder |
| Open app | *(browser)* | http://localhost:5173 |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot connect to server" | Backend not running | Run `npm start` in server/ folder |
| "MongoDB connection error" | Wrong Atlas URI | Check MONGO_URI in server/.env |
| "Email already registered" | Email exists | Use Login tab instead |
| "Invalid email or password" | Wrong credentials | Check email + password |
| Port 5000 already in use | Another app using it | Change `PORT=5001` in server/.env |
