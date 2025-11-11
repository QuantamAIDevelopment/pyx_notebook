import { io } from 'socket.io-client';

export const connectWebSocket = (sessionId, onMessage) => {
  const socket = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
  
  socket.onopen = () => {
    console.log('WebSocket connected');
  };
  
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    onMessage(message);
  };
  
  socket.onclose = () => {
    console.log('WebSocket disconnected');
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return socket;
};