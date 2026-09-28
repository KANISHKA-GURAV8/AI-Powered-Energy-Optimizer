import json
import random
from datetime import date, timedelta

USER_ID = "6a5d1487f293c0ca12805fe7"

START_DATE = date(2026, 7, 21)
DAYS = 68

APPLIANCES = [
  { "name": 'AC',              "power": 1500, "quantity": 2,  "priority": 'Medium' },
  { "name": 'Fridge',          "power": 180,  "quantity": 1,  "priority": 'Essential' },
  { "name": 'Geyser',          "power": 2000, "quantity": 2,  "priority": 'Medium' },
  { "name": 'Water Purifier',  "power": 50,   "quantity": 1,  "priority": 'Essential' },
  { "name": 'WiFi Router',     "power": 15,   "quantity": 1,  "priority": 'Essential' },
  { "name": 'Washing Machine', "power": 500,  "quantity": 1,  "priority": 'Non-essential' },
  { "name": 'Lights',          "power": 9,    "quantity": 12, "priority": 'Essential' },
  { "name": 'TV',              "power": 120,  "quantity": 1,  "priority": 'Non-essential' },
  { "name": 'Mixer',           "power": 750,  "quantity": 1,  "priority": 'Non-essential' },
  { "name": 'Cooler',          "power": 200,  "quantity": 1,  "priority": 'Medium' },
  { "name": 'Iron Box',        "power": 1000, "quantity": 1,  "priority": 'Non-essential' },
]

appliances_docs = []
energylogs_docs = []
app_id_counter = 1
log_id_counter = 1

def generate_id(prefix, counter):
    return f"{prefix}{counter:04x}"

for i in range(DAYS):
    current_date = START_DATE + timedelta(days=i)
    date_str = current_date.strftime("%Y-%m-%d")
    iso_date_str = current_date.strftime("%Y-%m-%dT08:00:00.000Z")
    
    daily_total_units = 0.0
    
    for app in APPLIANCES:
        name = app["name"]
        hours = 0
        
        if name in ["Fridge", "WiFi Router"]:
            hours = 24
        elif name == "Water Purifier":
            hours = random.uniform(1, 3)
        elif name == "Lights":
            hours = random.uniform(4, 8)
        elif name == "TV":
            hours = random.uniform(2, 6)
        elif name == "AC":
            if current_date.weekday() >= 5:
                hours = random.uniform(6, 10)
            else:
                hours = random.uniform(2, 5)
        elif name == "Cooler":
            hours = random.uniform(0, 4)
        elif name == "Geyser":
            hours = random.uniform(1, 2)
        elif name == "Mixer":
            hours = random.uniform(0.2, 0.5)
        elif name == "Washing Machine":
            if i % random.choice([2, 3]) == 0:
                hours = random.uniform(1, 2)
        elif name == "Iron Box":
            if i % random.choice([3, 4]) == 0:
                hours = random.uniform(0.5, 1)
        
        kwh = (app["power"] * app["quantity"] * hours) / 1000.0
        kwh = round(kwh, 2)
        
        daily_total_units += kwh
        
        doc = {
            "_id": { "$oid": generate_id("6a5b1efe38e1e626fec4", app_id_counter) },
            "userId": { "$oid": USER_ID },
            "name": name,
            "power": app["power"],
            "quantity": app["quantity"],
            "priority": app["priority"],
            "active": 0,
            "status": False,
            "createdAt": { "$date": iso_date_str },
            "updatedAt": { "$date": iso_date_str },
            "__v": 0,
            "lastActiveAt": None,
            "turnedOnAt": None,
            "accumulatedKwhToday": kwh
        }
        appliances_docs.append(doc)
        app_id_counter += 1
        
    log_doc = {
        "_id": { "$oid": generate_id("6a5c60a7b76b88faceab", log_id_counter) },
        "userId": { "$oid": USER_ID },
        "date": date_str,
        "costPerUnit": 5.80,
        "unitsConsumed": round(daily_total_units, 2)
    }
    energylogs_docs.append(log_doc)
    log_id_counter += 1

with open('c:/Users/kanis/OneDrive/Desktop/Major_Project/server/appliances_mock.json', 'w') as f:
    json.dump(appliances_docs, f, indent=2)

with open('c:/Users/kanis/OneDrive/Desktop/Major_Project/server/energylogs_mock.json', 'w') as f:
    json.dump(energylogs_docs, f, indent=2)

print("Successfully generated data!")
