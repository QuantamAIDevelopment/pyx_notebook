import os
import shutil
from typing import Dict, Any
from pathlib import Path

class FileAgent:
    def __init__(self):
        self.base_upload_dir = Path("uploads")
        self.base_upload_dir.mkdir(exist_ok=True)
    
    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        action = state.get("action")
        data = state.get("data", {})
        session_id = state.get("session_id")
        
        if action == "upload_file":
            result = self._upload_file(data, session_id)
        elif action == "list_files":
            result = self._list_files(session_id)
        elif action == "cleanup_session":
            result = self._cleanup_session(session_id)
        else:
            result = {"error": "Unknown file action"}
        
        state["result"] = result
        return state
    
    def _upload_file(self, data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        session_dir = self.base_upload_dir / session_id
        session_dir.mkdir(exist_ok=True)
        
        filename = data.get("filename")
        file_content = data.get("content")
        
        file_path = session_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        result = {
            "status": "uploaded",
            "filename": filename,
            "path": str(file_path)
        }
        
        if filename.endswith('.ipynb'):
            import json
            notebook_data = json.loads(file_content.decode('utf-8'))
            cells = []
            for idx, cell in enumerate(notebook_data.get('cells', [])):
                cells.append({
                    "cell_type": cell.get('cell_type', 'code'),
                    "source": ''.join(cell.get('source', [])),
                    "order_index": idx
                })
            result["notebook_cells"] = cells
        
        return result
    
    def _list_files(self, session_id: str) -> Dict[str, Any]:
        session_dir = self.base_upload_dir / session_id
        if not session_dir.exists():
            return {"files": []}
        
        files = [{
            "name": f.name,
            "size": f.stat().st_size,
            "is_notebook": f.name.endswith('.ipynb')
        } for f in session_dir.iterdir() if f.is_file()]
        return {"files": files}
    
    def _cleanup_session(self, session_id: str) -> Dict[str, Any]:
        session_dir = self.base_upload_dir / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir)
        return {"status": "cleaned"}
