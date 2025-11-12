import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { runCell } from '../api';

const NotebookCell = ({ cell, sessionId, onUpdate, onDelete, index, onAddCell }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [showInputPrompt, setShowInputPrompt] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef(null);

  const handleCodeChange = (value) => {
    onUpdate(cell.id, { source: value });
  };
  
  const handleRunAndAddCell = async () => {
    await handleRunCell();
    if (onAddCell) {
      setTimeout(() => onAddCell(), 500);
    }
  };

  const handleRunCell = async () => {
    if (cell.source.includes('input(') && !showInputPrompt) {
      setShowInputPrompt(true);
      return;
    }
    
    setIsRunning(true);
    setShowInputPrompt(false);
    try {
      let modifiedCode = cell.source;
      if (cell.source.includes('input(')) {
        const inputs = userInput.split('\n');
        let inputIndex = 0;
        modifiedCode = cell.source.replace(/input\([^)]*\)/g, () => {
          const value = inputs[inputIndex] || '';
          inputIndex++;
          return `'${value}'`;
        });
      }
      
      const response = await runCell(sessionId, {
        cell_id: cell.id,
        code: modifiedCode,
        session_id: sessionId
      });
      
      console.log('Response:', response);
      
      const outputText = (response.output || '') + (response.error || '');
      onUpdate(cell.id, { output: outputText });
      setUserInput('');
    } catch (error) {
      console.error('Failed to run cell:', error);
      onUpdate(cell.id, { output: `Error: ${error.message}` });
    } finally {
      setIsRunning(false);
    }
  };
  
  console.log('Cell output:', cell.output);

  return (
    <div 
      className={`group relative mb-4 transition-all ${
        isFocused ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
      }`}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
    >
      <div className="flex">
        {/* Left sidebar with play button */}
        <div className="flex flex-col items-center pt-3 pr-2">
          <button
            onClick={handleRunCell}
            disabled={isRunning}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRunning 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-white border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-50'
            }`}
            title="Run cell (Ctrl+Enter)"
          >
            {isRunning ? (
              <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            )}
          </button>
          <span className="text-xs text-gray-400 mt-1">[{index + 1}]</span>
        </div>

        {/* Main cell content */}
        <div className="flex-1">
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            <div className="relative">
              <Editor
                height="auto"
                language={cell.cell_type === 'code' ? 'python' : 'markdown'}
                value={cell.source || ''}
                onChange={handleCodeChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  
                  const updateHeight = () => {
                    const contentHeight = editor.getContentHeight();
                    const container = editor.getDomNode();
                    if (container) {
                      container.style.height = contentHeight + 'px';
                    }
                    editor.layout();
                  };
                  
                  editor.onDidContentSizeChange(updateHeight);
                  
                  // Ctrl+Enter: Run cell
                  editor.addCommand(2048 | 3, () => {
                    handleRunCell();
                    return null;
                  });
                  
                  // Shift+Enter: Run and add cell
                  editor.addCommand(1024 | 3, () => {
                    handleRunAndAddCell();
                    return null;
                  });
                  
                  updateHeight();
                  setTimeout(updateHeight, 100);
                }}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'off',
                  folding: false,
                  padding: { top: 12, bottom: 12 },
                  automaticLayout: true,
                  wordWrap: 'on',
                  readOnly: false,
                  scrollbar: { 
                    vertical: 'hidden',
                    horizontal: 'hidden'
                  }
                }}
              />
            </div>

            {showInputPrompt && (
              <div className="border-t p-4 bg-blue-50">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input required (one value per line):
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Enter input values..."
                      className="w-full p-3 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      autoFocus
                    />
                    <button
                      onClick={handleRunCell}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Submit & Run
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cell.output && (
            <div className="mt-2 border border-gray-300 rounded-lg bg-gray-50 p-4">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                {cell.output}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
        isFocused ? 'opacity-100' : ''
      }`}>
        <button
          onClick={() => onDelete(cell.id)}
          className="p-1.5 bg-white border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 transition-colors"
          title="Delete cell"
        >
          <svg className="w-4 h-4 text-gray-600 hover:text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotebookCell;