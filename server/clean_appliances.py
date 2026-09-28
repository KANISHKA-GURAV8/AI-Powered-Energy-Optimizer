import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables to get MONGO_URI
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("Error: MONGO_URI not found in .env")
    exit(1)

client = MongoClient(MONGO_URI)
db = client["energy_optimizer"]

# Delete all appliances to clear out duplicates. 
# They will be freshly seeded ONCE when you next load the Appliances page.
result = db.appliances.delete_many({})
print(f"Cleanup Complete! Deleted {result.deleted_count} duplicate appliances.")
print("Go back to your React app and reload the Appliances page to see the correct 11 default appliances.")
