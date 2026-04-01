import sqlite3
import os

db_path = "backend/neurix.db"
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("PRAGMA table_info(users)")
rows = cur.fetchall()
for row in rows:
    print(row)
conn.close()
