from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/notebook_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sessions = relationship("Session", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="sessions")
    notebooks = relationship("Notebook", back_populates="session")

class Notebook(Base):
    __tablename__ = "notebooks"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    title = Column(String, default="Untitled Notebook")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_saved = Column(Boolean, default=False)
    session = relationship("Session", back_populates="notebooks")
    cells = relationship("Cell", back_populates="notebook", order_by="Cell.order_index")

class Cell(Base):
    __tablename__ = "cells"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))
    cell_type = Column(String, default="code")  # code, markdown
    source = Column(Text, default="")
    output = Column(Text, default="")
    order_index = Column(Integer, default=0)
    notebook = relationship("Notebook", back_populates="cells")
    executions = relationship("Execution", back_populates="cell")

class Execution(Base):
    __tablename__ = "executions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cell_id = Column(Integer, ForeignKey("cells.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, completed, error
    logs = Column(Text, default="")
    cell = relationship("Cell", back_populates="executions")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)