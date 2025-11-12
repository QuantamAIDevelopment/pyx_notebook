from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/notebook_db")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE"))
    conn.commit()
    print("Column added successfully")
