
from passlib.context import CryptContext
import sys

try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    print("Hashing 'cmd123'...")
    h = pwd_context.hash("cmd123")
    print(f"Success: {h}")
    
    print("Testing 72-char limit...")
    long_pwd = "a" * 73
    try:
        pwd_context.hash(long_pwd)
        print("Error: Should have failed 73 chars (or truncated if configured)")
    except ValueError as e:
        print(f"Caught expected error for 73 chars: {e}")
        
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
