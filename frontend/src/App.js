import React, { useState, useEffect } from 'react';
import NotebookCell from './components/NotebookCell';
import { createSession, loadNotebook, saveNotebook, createCell } from './api';
import { connectWebSocket } from './websocket';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [notebook, setNotebook] = useState({ title: 'Untitled Notebook' });
  const [cells, setCells] = useState([]);
  const [ws, setWs] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('Untitled Notebook');

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const websocket = connectWebSocket(sessionId, handleWebSocketMessage);
      setWs(websocket);
      loadNotebookData();
    }
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      const response = await createSession({ user_id: 1 });
      setSessionId(response.session_id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const loadNotebookData = async () => {
    try {
      const response = await loadNotebook(sessionId);
      if (response.notebook) {
        setNotebook(response.notebook);
        setCells(response.notebook.cells || []);
      }
    } catch (error) {
      console.error('Failed to load notebook:', error);
    }
  };

  const handleWebSocketMessage = (message) => {
    if (message.type === 'execution_result') {
      const { cell_id, output, error } = message.data;
      setCells(prev => prev.map(cell => 
        cell.id === cell_id 
          ? { ...cell, output: output + error }
          : cell
      ));
    }
  };

  const addCell = async () => {
    if (!sessionId) return;
    
    try {
      const response = await createCell(sessionId, {
        cell_type: 'code',
        source: '',
        order_index: cells.length
      });
      
      const newCell = {
        id: response.cell_id,
        cell_type: 'code',
        source: '',
        output: '',
        order_index: cells.length
      };
      setCells([...cells, newCell]);
    } catch (error) {
      console.error('Failed to create cell:', error);
    }
  };

  const handleTitleChange = () => {
    setNotebook({ ...notebook, title: titleInput });
    setIsEditingTitle(false);
  };

  const updateCell = (cellId, updates) => {
    setCells(prev => prev.map(cell => 
      cell.id === cellId ? { ...cell, ...updates } : cell
    ));
  };

  const deleteCell = (cellId) => {
    setCells(prev => prev.filter(cell => cell.id !== cellId));
  };

  const saveNotebookData = async () => {
    try {
      await saveNotebook(sessionId, {
        title: notebook?.title || 'Untitled Notebook',
        cells: cells
      });
      alert('Notebook saved successfully!');
    } catch (error) {
      console.error('Failed to save notebook:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleTitleChange()}
                  className="text-xl font-normal text-gray-800 border-b-2 border-blue-500 focus:outline-none px-1"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-xl font-normal text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setTitleInput(notebook?.title || 'Untitled Notebook');
                  }}
                >
                  {notebook?.title || 'Untitled Notebook'}
                </h1>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={addCell}
                className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Code</span>
              </button>
              <button
                onClick={saveNotebookData}
                className="flex items-center space-x-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/>
                </svg>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {cells.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl text-gray-600 mb-2">Welcome to your notebook</h2>
            <p className="text-gray-500 mb-6">Start by adding your first code cell</p>
            <button
              onClick={addCell}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add Code Cell</span>
            </button>
          </div>
        ) : (
          <div>
            {cells.map((cell, index) => (
              <NotebookCell
                key={cell.id}
                cell={cell}
                index={index}
                sessionId={sessionId}
                onUpdate={updateCell}
                onDelete={deleteCell}
              />
            ))}
            <div className="mt-4 flex justify-center">
              <button
                onClick={addCell}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Code</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;