import React, { useState, useEffect } from 'react';
import NotebookCell from './components/NotebookCell';
import { createSession, loadNotebook, saveNotebook, createCell, listNotebooks, uploadFile, listFiles, cleanupSession } from './api';
import { connectWebSocket } from './websocket';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [notebook, setNotebook] = useState({ title: 'Untitled Notebook' });
  const [cells, setCells] = useState([]);
  const [ws, setWs] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('Untitled Notebook');
  const [showNotebookList, setShowNotebookList] = useState(false);
  const [notebooks, setNotebooks] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const websocket = connectWebSocket(sessionId, handleWebSocketMessage);
      setWs(websocket);
      loadNotebookData();
      loadFiles();
    }
    return () => {
      if (sessionId) {
        cleanupSession(sessionId);
      }
    };
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

  const loadNotebooksList = async () => {
    try {
      const response = await listNotebooks();
      setNotebooks(response.notebooks || []);
      setShowNotebookList(true);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    }
  };

  const openNotebook = async (notebookSessionId) => {
    setSessionId(notebookSessionId);
    setShowNotebookList(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !sessionId) return;
    
    try {
      const result = await uploadFile(sessionId, file);
      await loadFiles();
      if (result.notebook_cells && file.name.endsWith('.ipynb')) {
        const newCells = [];
        for (const cell of result.notebook_cells) {
          const response = await createCell(sessionId, cell);
          newCells.push({
            ...cell,
            id: response.cell_id,
            output: ''
          });
        }
        setCells(newCells);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
    e.target.value = '';
  };

  const loadFiles = async () => {
    if (!sessionId) return;
    try {
      const response = await listFiles(sessionId);
      setUploadedFiles(response.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const handleFileClick = async (file) => {
    if (file.is_notebook) {
      try {
        const blob = await fetch(`http://localhost:8000/uploads/${sessionId}/${file.name}`).then(r => r.blob());
        const result = await uploadFile(sessionId, new File([blob], file.name));
        if (result.notebook_cells) {
          const newCells = [];
          for (const cell of result.notebook_cells) {
            const response = await createCell(sessionId, cell);
            newCells.push({
              ...cell,
              id: response.cell_id,
              output: ''
            });
          }
          setCells(newCells);
        }
      } catch (error) {
        console.error('Failed to load notebook:', error);
      }
    }
  };

  const copyFilePath = (filename) => {
    const path = `uploads/${sessionId}/${filename}`;
    navigator.clipboard.writeText(path);
    alert('Path copied to clipboard!');
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
                onClick={loadNotebooksList}
                className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
                <span>My Notebooks</span>
              </button>
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

      <main className="flex">
        <aside className="w-64 border-r bg-gray-50 min-h-screen p-4">
          <div className="mb-4">
            <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"/>
              </svg>
              <span>Upload File</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Files</h3>
            <div className="space-y-1">
              {uploadedFiles.map(file => (
                <div
                  key={file.name}
                  className={`p-2 rounded text-sm group ${
                    file.is_notebook ? 'bg-orange-100 hover:bg-orange-200' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => handleFileClick(file)}
                      className="flex items-center space-x-2 flex-1 cursor-pointer"
                    >
                      {file.is_notebook ? (
                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                        </svg>
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyFilePath(file.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                      title="Copy path"
                    >
                      <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1 max-w-4xl mx-auto px-6 py-8">

        {showNotebookList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Notebooks</h2>
                <button onClick={() => setShowNotebookList(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {notebooks.map(nb => (
                  <div key={nb.id} onClick={() => openNotebook(nb.session_id)} className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium">{nb.title}</h3>
                    <p className="text-sm text-gray-500">Updated: {new Date(nb.updated_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
        </div>
      </main>
    </div>
  );
}

export default App;