from pymongo import MongoClient

MONGO_URI = "mongodb+srv://dhruvr101:dhruvreddy27@leetcodepvp.9mer5kv.mongodb.net/auth_db?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["auth_db"]

print("✅ Connected to MongoDB")