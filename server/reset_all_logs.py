import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["energy_optimizer"]

# Reset ALL energy logs to 0 for a clean slate
result = db.energylogs.update_many(
    {},
    {"$set": {"unitsConsumed": 0.0}}
)
print(f"Reset {result.modified_count} log(s) to 0 kWh.")

# Print remaining logs
all_logs = list(db.energylogs.find({}))
print("All logs after reset:")
for l in all_logs:
    print(f"  Date: {l['date']}  Units: {l['unitsConsumed']}")
