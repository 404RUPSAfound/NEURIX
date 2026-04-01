import sqlite3
import os

db_path = r'c:\Users\RUPSA\Desktop\NEURIX\Backend\neurix.db'
if not os.path.exists(db_path):
    print(f"DB NOT FOUND AT {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM resource_inventory;")
    count = cursor.fetchone()[0]
    print(f"RESOURCES: {count}")
    
    cursor.execute("SELECT COUNT(*) FROM relief_log;")
    count = cursor.fetchone()[0]
    print(f"RELIEF LOGS: {count}")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    conn.close()
