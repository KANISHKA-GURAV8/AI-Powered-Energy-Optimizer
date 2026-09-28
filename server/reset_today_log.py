import os
from datetime import date
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("Error: MONGO_URI not found in .env")
    exit(1)

client = MongoClient(MONGO_URI)
db = client["energy_optimizer"]

today = str(date.today())  # "2026-09-27"

# Reset today's log to 0 units consumed
result = db.energylogs.update_many(
    {"date": today},
    {"$set": {"unitsConsumed": 0.0, "costPerUnit": 5.80}}
)

print(f"Reset {result.modified_count} log(s) for today ({today}) to 0 kWh.")
print("Refresh your dashboard — Units Consumed and Current Cost will now show 0.")
