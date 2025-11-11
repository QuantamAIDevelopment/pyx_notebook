from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List
import json
import asyncio
from src.agents.supervisor_agent import SupervisorAgent
from src.models.database import get_db

app = FastAPI(title="Notebook Platform API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supervisor = SupervisorAgent()

class NotebookRequest(BaseModel):
    action: str
    data: Dict[str, Any] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))

manager = ConnectionManager()

@app.post("/api/session")
async def create_session(request: NotebookRequest):
    result = await supervisor.process_request("", "create_session", request.data)
    return JSONResponse(content=result)

@app.post("/api/notebook/{session_id}")
async def notebook_action(session_id: str, request: NotebookRequest):
    result = await supervisor.process_request(session_id, request.action, request.data)
    
    # Send real-time update via WebSocket
    if request.action == "run_cell" and "output" in result:
        await manager.send_message(session_id, {
            "type": "execution_result",
            "data": result
        })
    
    return JSONResponse(content=result)

@app.get("/api/notebook/{session_id}")
async def load_notebook(session_id: str):
    result = await supervisor.process_request(session_id, "load_notebook", {})
    return JSONResponse(content=result)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)