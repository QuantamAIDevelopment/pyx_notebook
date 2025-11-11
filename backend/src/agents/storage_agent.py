from typing import Dict, Any
from src.models.database import get_db, Session, Notebook, Cell, User
from datetime import datetime
import uuid

class StorageAgent:
    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        action = state.get("action")
        data = state.get("data", {})
        session_id = state.get("session_id")
        
        if action == "create_session":
            result = self._create_session(data)
        elif action == "save_notebook":
            result = self._save_notebook(data, session_id)
        elif action == "load_notebook":
            result = self._load_notebook(session_id)
        else:
            result = {"error": "Unknown storage action"}
        
        state["result"] = result
        return state
    
    def _create_session(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = next(get_db())
        try:
            session_id = str(uuid.uuid4())
            
            # Create default user if not exists
            user = db.query(User).filter(User.id == 1).first()
            if not user:
                user = User(id=1, name="Default User", email="user@example.com")
                db.add(user)
                db.commit()
            
            session = Session(
                id=session_id,
                user_id=1
            )
            db.add(session)
            
            # Create default notebook
            notebook = Notebook(
                session_id=session_id,
                title=data.get("title", "Untitled Notebook")
            )
            db.add(notebook)
            
            # Create default cell
            cell = Cell(
                notebook_id=notebook.id,
                cell_type="code",
                source="# Welcome to your notebook\nprint('Hello, World!')",
                order_index=0
            )
            db.add(cell)
            
            db.commit()
            db.refresh(session)
            db.refresh(notebook)
            
            return {
                "session_id": session_id,
                "notebook_id": notebook.id,
                "status": "created"
            }
        finally:
            db.close()
    
    def _save_notebook(self, data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        db = next(get_db())
        try:
            notebook = db.query(Notebook).filter(Notebook.session_id == session_id).first()
            if not notebook:
                return {"error": "Notebook not found"}
            
            notebook.title = data.get("title", notebook.title)
            notebook.updated_at = datetime.utcnow()
            
            # Update cells if provided
            cells_data = data.get("cells", [])
            for cell_data in cells_data:
                cell = db.query(Cell).filter(Cell.id == cell_data.get("id")).first()
                if cell:
                    cell.source = cell_data.get("source", cell.source)
                    cell.cell_type = cell_data.get("cell_type", cell.cell_type)
                    cell.order_index = cell_data.get("order_index", cell.order_index)
            
            db.commit()
            return {"status": "saved", "notebook_id": notebook.id}
        finally:
            db.close()
    
    def _load_notebook(self, session_id: str) -> Dict[str, Any]:
        db = next(get_db())
        try:
            notebook = db.query(Notebook).filter(Notebook.session_id == session_id).first()
            if not notebook:
                return {"error": "Notebook not found"}
            
            cells = db.query(Cell).filter(Cell.notebook_id == notebook.id).order_by(Cell.order_index).all()
            
            cells_data = []
            for cell in cells:
                cells_data.append({
                    "id": cell.id,
                    "cell_type": cell.cell_type,
                    "source": cell.source,
                    "output": cell.output,
                    "order_index": cell.order_index
                })
            
            return {
                "notebook": {
                    "id": notebook.id,
                    "title": notebook.title,
                    "created_at": notebook.created_at.isoformat(),
                    "updated_at": notebook.updated_at.isoformat(),
                    "cells": cells_data
                }
            }
        finally:
            db.close()