from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal, List, Dict, Any
from src.agents.ui_agent import UIAgent
from src.agents.execution_agent import ExecutionAgent
from src.agents.storage_agent import StorageAgent

class AgentState(TypedDict):
    messages: List[Dict[str, Any]]
    session_id: str
    action: str
    data: Dict[str, Any]
    result: Dict[str, Any]

# Singleton execution agent to maintain kernels
_execution_agent = ExecutionAgent()

class SupervisorAgent:
    def __init__(self):
        self.ui_agent = UIAgent()
        self.execution_agent = _execution_agent
        self.storage_agent = StorageAgent()
        self.graph = self._build_graph()
    
    def _build_graph(self):
        workflow = StateGraph(AgentState)
        
        workflow.add_node("supervisor", self.supervisor_node)
        workflow.add_node("ui_agent", self.ui_agent.process)
        workflow.add_node("execution_agent", self.execution_agent.process)
        workflow.add_node("storage_agent", self.storage_agent.process)
        
        workflow.set_entry_point("supervisor")
        
        workflow.add_conditional_edges(
            "supervisor",
            self.route_request,
            {
                "ui": "ui_agent",
                "execute": "execution_agent", 
                "storage": "storage_agent",
                "end": END
            }
        )
        
        workflow.add_edge("ui_agent", END)
        workflow.add_edge("execution_agent", END)
        workflow.add_edge("storage_agent", END)
        
        return workflow.compile()
    
    def supervisor_node(self, state: AgentState) -> AgentState:
        action = state.get("action", "")
        return state
    
    def route_request(self, state: AgentState) -> Literal["ui", "execute", "storage", "end"]:
        action = state.get("action", "")
        
        if action in ["create_cell", "delete_cell", "update_cell"]:
            return "ui"
        elif action in ["run_cell", "run_all"]:
            return "execute"
        elif action in ["save_notebook", "load_notebook", "create_session"]:
            return "storage"
        else:
            return "end"
    
    async def process_request(self, session_id: str, action: str, data: Dict[str, Any]) -> Dict[str, Any]:
        initial_state = AgentState(
            messages=[],
            session_id=session_id,
            action=action,
            data=data,
            result={}
        )
        
        result = await self.graph.ainvoke(initial_state)
        return result.get("result", {})