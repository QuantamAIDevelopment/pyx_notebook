from typing import Dict, Any
from models.database import get_db, Cell, Notebook
from sqlalchemy.orm import Session

class UIAgent:
    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        action = state.get("action")
        data = state.get("data", {})
        session_id = state.get("session_id")
        
        if action == "create_cell":
            result = self._create_cell(data, session_id)
        elif action == "delete_cell":
            result = self._delete_cell(data)
        elif action == "update_cell":
            result = self._update_cell(data)
        else:
            result = {"error": "Unknown UI action"}
        
        state["result"] = result
        return state
    
    def _create_cell(self, data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        db = next(get_db())
        try:
            notebook = db.query(Notebook).filter(Notebook.session_id == session_id).first()
            if not notebook:
                return {"error": "Notebook not found"}
            
            cell = Cell(
                notebook_id=notebook.id,
                cell_type=data.get("cell_type", "code"),
                source=data.get("source", ""),
                order_index=data.get("order_index", 0)
            )
            db.add(cell)
            db.commit()
            db.refresh(cell)
            
            return {"cell_id": cell.id, "status": "created"}
        finally:
            db.close()
    
    def _delete_cell(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = next(get_db())
        try:
            cell = db.query(Cell).filter(Cell.id == data.get("cell_id")).first()
            if cell:
                db.delete(cell)
                db.commit()
                return {"status": "deleted"}
            return {"error": "Cell not found"}
        finally:
            db.close()
    
    def _update_cell(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = next(get_db())
        try:
            cell = db.query(Cell).filter(Cell.id == data.get("cell_id")).first()
            if cell:
                cell.source = data.get("source", cell.source)
                cell.cell_type = data.get("cell_type", cell.cell_type)
                db.commit()
                return {"status": "updated"}
            return {"error": "Cell not found"}
        finally:
            db.close()