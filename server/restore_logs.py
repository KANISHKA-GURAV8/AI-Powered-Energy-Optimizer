import os
import json
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["energy_optimizer"]

# Load original mock data
with open(os.path.join(os.path.dirname(__file__), 'energylogs_mock.json'), 'r') as f:
    mock_data = json.load(f)

restored = 0
for entry in mock_data:
    oid = entry["_id"]["$oid"]
    units = entry["unitsConsumed"]
    cost = entry["costPerUnit"]
    result = db.energylogs.update_one(
        {"_id": ObjectId(oid)},
        {"$set": {"unitsConsumed": units, "costPerUnit": cost}}
    )
    if result.modified_count:
        restored += 1

print(f"Restored {restored} / {len(mock_data)} log entries to original values.")
print("Refresh your dashboard now.")
