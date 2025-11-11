import subprocess
import sys
import io
from contextlib import redirect_stdout, redirect_stderr
from typing import Dict, Any
from models.database import get_db, Cell, Execution
from datetime import datetime
from jupyter_client import KernelManager
import queue
import time

class ExecutionAgent:
    def __init__(self):
        self.kernels = {}  # session_id -> KernelManager
    
    def _get_kernel(self, session_id: str):
        if session_id not in self.kernels:
            km = KernelManager()
            km.start_kernel()
            self.kernels[session_id] = km
        return self.kernels[session_id]
    def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        action = state.get("action")
        data = state.get("data", {})
        
        if action == "run_cell":
            result = self._run_cell(data)
        elif action == "run_all":
            result = self._run_all_cells(data)
        else:
            result = {"error": "Unknown execution action"}
        
        state["result"] = result
        return state
    
    def _run_cell(self, data: Dict[str, Any]) -> Dict[str, Any]:
        cell_id = data.get("cell_id")
        code = data.get("code", "")
        
        db = next(get_db())
        try:
            # Validate cell exists
            cell = db.query(Cell).filter(Cell.id == cell_id).first()
            if not cell:
                return {"error": "Cell not found", "status": "error"}
            
            # Create execution record
            execution = Execution(
                cell_id=int(cell_id),
                status="running"
            )
            db.add(execution)
            db.commit()
            db.refresh(execution)
            
            # Execute code with kernel
            session_id_str = data.get("session_id", "")
            output, error, status = self._execute_python_code(code, session_id_str)
            
            # Update execution record
            execution.ended_at = datetime.utcnow()
            execution.status = status
            execution.logs = output + error
            
            # Update cell output
            cell.output = output + error
            
            db.commit()
            
            return {
                "execution_id": execution.id,
                "output": output,
                "error": error,
                "status": status
            }
        finally:
            db.close()
    
    def _execute_python_code(self, code: str, session_id: str = None) -> tuple:
        if not session_id:
            # Fallback to old exec method
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            try:
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    exec(code, {"__builtins__": __builtins__})
                output = stdout_capture.getvalue()
                error = stderr_capture.getvalue()
                status = "completed" if not error else "error"
                return output, error, status
            except Exception as e:
                return "", str(e), "error"
        
        # Use Jupyter kernel
        km = self._get_kernel(session_id)
        kc = km.client()
        kc.start_channels()
        
        try:
            msg_id = kc.execute(code)
            output = ""
            error = ""
            
            while True:
                try:
                    msg = kc.get_iopub_msg(timeout=10)
                    msg_type = msg['header']['msg_type']
                    content = msg['content']
                    
                    if msg_type == 'stream':
                        output += content['text']
                    elif msg_type == 'error':
                        error += '\n'.join(content['traceback'])
                    elif msg_type == 'execute_result':
                        output += str(content['data'].get('text/plain', ''))
                    elif msg_type == 'status' and content['execution_state'] == 'idle':
                        break
                except queue.Empty:
                    break
            
            status = "error" if error else "completed"
            return output, error, status
        finally:
            kc.stop_channels()
    
    def _run_all_cells(self, data: Dict[str, Any]) -> Dict[str, Any]:
        notebook_id = data.get("notebook_id")
        
        db = next(get_db())
        try:
            cells = db.query(Cell).filter(
                Cell.notebook_id == notebook_id,
                Cell.cell_type == "code"
            ).order_by(Cell.order_index).all()
            
            results = []
            for cell in cells:
                result = self._run_cell({"cell_id": cell.id, "code": cell.source})
                results.append(result)
            
            return {"results": results, "status": "completed"}
        finally:
            db.close()