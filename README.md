# Interactive Notebook Platform

A Colab-like interactive code execution platform built with LangGraph, FastAPI, React, and PostgreSQL.

## Architecture

- **Supervisor Agent**: Orchestrates requests using LangGraph
- **UI Agent**: Manages notebook cell operations
- **Execution Agent**: Runs Python code securely
- **Storage Agent**: Handles PostgreSQL persistence
- **Frontend**: React with Monaco Editor
- **Backend**: FastAPI with WebSocket streaming

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to project
cd NOTEBOOK

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Manual Setup

#### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/notebook_db"

# Start the server
uvicorn main:app --reload
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

#### Database Setup

```bash
# Start PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_DB=notebook_db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

## Features

- **Interactive Code Cells**: Write and execute Python code
- **Real-time Output**: Stream execution results via WebSocket
- **Session Management**: Persistent notebook sessions
- **Agent Orchestration**: LangGraph-based multi-agent system
- **Database Persistence**: PostgreSQL storage for all data

## API Endpoints

- `POST /api/session` - Create new session
- `GET /api/notebook/{session_id}` - Load notebook
- `POST /api/notebook/{session_id}` - Execute actions
- `WS /ws/{session_id}` - WebSocket for real-time updates

## Agent Actions

- `create_session` - Initialize new notebook session
- `create_cell` - Add new code/markdown cell
- `update_cell` - Modify cell content
- `delete_cell` - Remove cell
- `run_cell` - Execute code cell
- `save_notebook` - Persist notebook state
- `load_notebook` - Retrieve notebook data

## Tech Stack

- **Backend**: FastAPI, LangGraph, SQLAlchemy, PostgreSQL
- **Frontend**: React, Monaco Editor, Tailwind CSS
- **Communication**: WebSocket, REST API
- **Deployment**: Docker, Docker Compose

## Development

The system uses a modular agent architecture where the Supervisor Agent routes requests to specialized agents:

1. **UI Agent** handles cell operations
2. **Execution Agent** runs code safely
3. **Storage Agent** manages database operations

Each agent processes requests independently and returns structured responses to the supervisor.