// app/game/[roomId]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiUser, FiUsers, FiMessageSquare, FiEdit } from "react-icons/fi";

interface User {
  id: string;
  name: string;
  isHost: boolean;
}

interface Room {
  id: string;
  users: User[];
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  type: "chat" | "system" | "guess";
  timestamp: number;
}

export default function GamePage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  
  // Drawing related states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canDraw, setCanDraw] = useState(false);
  const [drawColor, setDrawColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  // Set up WebSocket connection
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Load user data from localStorage
    const savedUserData = localStorage.getItem('drawAndGuessUser');
    
    if (savedUserData) {
      const userData = JSON.parse(savedUserData);
      
      // Check if the user is in the correct room
      if (userData.roomId !== roomId) {
        // Handle case where user tries to access wrong room
        setError("You're not part of this room. Please join from the homepage.");
        setIsLoading(false);
        return;
      }
      
      setCurrentUser({
        id: userData.id,
        name: userData.name,
        isHost: userData.isHost
      });
      
      // Fetch room data
      fetchRoomData();
      
      // Set up WebSocket connection
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/socket?roomId=${roomId}&userId=${userData.id}`;
      
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onopen = () => {
        console.log('WebSocket connection established');
        
        // Add system message
        addSystemMessage(`${userData.name} joined the room`);
      };
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'userJoined':
            fetchRoomData(); // Refresh user list
            addSystemMessage(`${data.user.name} joined the room`);
            break;
          case 'userLeft':
            fetchRoomData(); // Refresh user list
            addSystemMessage(`${data.user.name} left the room`);
            break;
          case 'chat':
            addChatMessage(data.userId, data.username, data.text);
            break;
          case 'draw':
            handleDrawEvent(data);
            break;
          case 'clearCanvas':
            clearCanvas();
            break;
          case 'startRound':
            handleStartRound(data);
            break;
          case 'endRound':
            handleEndRound(data);
            break;
          case 'correctGuess':
            handleCorrectGuess(data);
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      };
      
      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    } else {
      // No user data, redirect to home
      router.push('/');
    }
  }, [roomId, router]);
  
  const fetchRoomData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rooms/${roomId}`);
      
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to fetch room data");
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
      setError("Failed to connect to the game server");
    } finally {
      setIsLoading(false);
    }
  };
  
  const addSystemMessage = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        text,
        type: 'system',
        timestamp: Date.now()
      }
    ]);
  };
  
  const addChatMessage = (userId: string, username: string, text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        userId,
        username,
        text,
        type: 'chat',
        timestamp: Date.now()
      }
    ]);
  };
  
  const sendMessage = () => {
    if (!messageInput.trim() || !currentUser || !socketRef.current) return;
    
    socketRef.current.send(JSON.stringify({
      type: 'chat',
      userId: currentUser.id,
      username: currentUser.name,
      text: messageInput
    }));
    
    setMessageInput("");
  };
  
  // Drawing functions
  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canDraw || !canvasRef.current) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      // Touch event
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Send draw start event to server
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'draw',
        action: 'start',
        x,
        y,
        color: drawColor,
        lineWidth
      }));
    }
  };
  
  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      // Touch event
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Send draw move event to server
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'draw',
        action: 'move',
        x,
        y,
        color: drawColor,
        lineWidth
      }));
    }
  };
  
  const handleDrawEnd = () => {
    if (!isDrawing || !canDraw) return;
    
    setIsDrawing(false);
    
    // Send draw end event to server
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'draw',
        action: 'end'
      }));
    }
  };
  
  const handleDrawEvent = (data: any) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    switch (data.action) {
      case 'start':
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        break;
      case 'move':
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        break;
      case 'end':
        ctx.closePath();
        break;
      default:
        console.log('Unknown draw action:', data.action);
    }
  };
  
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    clearCanvas();
    
    // Send clear canvas event to server
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'clearCanvas'
      }));
    }
  };
  
  const handleStartRound = (data: { drawerId: string, word?: string }) => {
    // Reset canvas
    clearCanvas();
    
    // Set drawing permissions
    setCanDraw(currentUser?.id === data.drawerId);
    
    // Add system message
    if (currentUser?.id === data.drawerId) {
      addSystemMessage(`It's your turn to draw! Your word is: ${data.word}`);
    } else {
      const drawer = room?.users.find(user => user.id === data.drawerId);
      addSystemMessage(`${drawer?.name || 'Someone'} is drawing now. Try to guess the word!`);
    }
  };
  
  const handleEndRound = (data: { word: string, winnerId?: string }) => {
    // Disable drawing for everyone
    setCanDraw(false);
    
    // Add system message
    if (data.winnerId) {
      const winner = room?.users.find(user => user.id === data.winnerId);
      addSystemMessage(`Round ended! ${winner?.name || 'Someone'} guessed the word correctly! The word was: ${data.word}`);
    } else {
      addSystemMessage(`Round ended! Nobody guessed the word. The word was: ${data.word}`);
    }
  };
  
  const handleCorrectGuess = (data: { userId: string, username: string }) => {
    // Add system message
    addSystemMessage(`${data.username} guessed the word correctly!`);
  };
  
  const startGame = () => {
    if (!currentUser?.isHost || !socketRef.current) return;
    
    socketRef.current.send(JSON.stringify({
      type: 'startGame'
    }));
  };

  // Handle canvas resize on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const parentDiv = canvas.parentElement;
      
      if (parentDiv) {
        // Set canvas size to parent div size while maintaining aspect ratio
        const parentWidth = parentDiv.clientWidth;
        const parentHeight = parentDiv.clientHeight;
        
        canvas.width = parentWidth;
        canvas.height = parentHeight;
      }
    };
    
    // Initial sizing
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize canvas context on first render
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
    }
  }, [drawColor, lineWidth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md">
          <h2 className="font-bold text-lg mb-2">Error</h2>
          <p>{error}</p>
          <button 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex text-black flex-col h-screen bg-gray-100">
      {/* Game header */}
      <header className="bg-white shadow-md p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Draw & Guess: Room {roomId}</h1>
          <div className="flex space-x-2">
            {currentUser?.isHost && (
              <button 
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
            <button 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              onClick={() => router.push('/')}
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>
      
      {/* Main game area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - User list */}
        <div className="w-1/5 bg-white shadow-md p-4 overflow-y-auto">
          <div className="flex items-center mb-4">
            <FiUsers className="mr-2" />
            <h2 className="font-bold">Players</h2>
          </div>
          <ul>
            {room?.users.map(user => (
              <li key={user.id} className="py-2 border-b last:border-b-0">
                <div className="flex items-center">
                  <FiUser className="mr-2" />
                  <span>{user.name}</span>
                  {user.isHost && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Host</span>
                  )}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">You</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Center - Drawing area */}
        <div className="w-3/5 flex flex-col bg-gray-50 p-4">
          <div className="flex-1 bg-white border border-gray-300 rounded-lg overflow-hidden relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />
          </div>
          
          {/* Drawing controls */}
          {canDraw && (
            <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label htmlFor="color-picker" className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    id="color-picker"
                    type="color"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
                
                <div className="flex-1">
                  <label htmlFor="line-width" className="block text-sm font-medium text-gray-700 mb-1">Line Width: {lineWidth}px</label>
                  <input
                    id="line-width"
                    type="range"
                    min="1"
                    max="20"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <button
                  onClick={handleClearCanvas}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Clear Canvas
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right sidebar - Chat area */}
        <div className="w-1/5 bg-white shadow-md flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center">
              <FiMessageSquare className="mr-2" />
              <h2 className="font-bold">Chat</h2>
            </div>
          </div>
          
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map(message => (
              <div key={message.id} className={`mb-3 ${message.type === 'system' ? 'text-gray-500 italic' : ''}`}>
                {message.type !== 'system' && (
                  <span className="font-bold">
                    {message.username === currentUser?.name ? 'You' : message.username}:
                  </span>
                )}
                <span className="ml-1">{message.text}</span>
              </div>
            ))}
          </div>
          
          {/* Message input */}
          <div className="p-4 border-t">
            <div className="flex">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your guess..."
                className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
              >
                <FiEdit />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}