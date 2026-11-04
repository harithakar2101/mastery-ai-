import sqlite3
import os
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", str(Path(__file__).resolve().parent.parent / "data" / "mastery.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
