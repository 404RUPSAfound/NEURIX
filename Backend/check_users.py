import sys
import os
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db import models

db = SessionLocal()
users = db.query(models.User).all()

print(f"{'Username':<15} | {'Email':<25} | {'Verified':<10} | {'Role':<10}")
print("-" * 70)
for u in users:
    print(f"{u.username:<15} | {u.email:<25} | {u.is_verified:<10} | {u.role:<10}")

db.close()
