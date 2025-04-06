"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { FiCopy, FiCheck, FiUsers, FiPlayCircle, FiUser } from "react-icons/fi";

// Define types
interface User {
  id: string;
  name: string;
  isHost: boolean;
}

interface Room {
  id: string;
  users: User[];
}

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check if room exists in URL
  useEffect(() => {
    const path = window.location.pathname;
    const urlRoomId = path.startsWith('/game/') ? path.substring(6) : null;
    
    if (urlRoomId) {
      // If we came to the page with a roomId in the URL, we should fetch room data
      fetchRoomData(urlRoomId);
      setRoomId(urlRoomId);
    }
  }, []);

  // Fetch room data from API
  const fetchRoomData = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rooms/${id}`);
      
      if (response.ok) {
        const room = await response.json();
        setUsers(room.users);
        setRoomLink(`${window.location.origin}/game/${id}`);
      } else {
        // Handle room not found
        setUsernameError("Room not found");
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
      setUsernameError("Failed to connect to the game server");
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    if (!username.trim()) {
      setUsernameError("Please enter a username");
      return;
    }

    setUsernameError("");
    setIsLoading(true);
    
    try {
      const newRoomId = uuidv4();
      const userId = uuidv4();
      
      // Create user object
      const newUser: User = { 
        id: userId, 
        name: username, 
        isHost: true 
      };
      
      // Create room on the backend
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: newRoomId,
          user: newUser
        }),
      });

      if (response.ok) {
        // Set local state
        setRoomId(newRoomId);
        setRoomLink(`${window.location.origin}/game/${newRoomId}`);
        setUsers([newUser]);
        
        // Store user info in localStorage for persistence
        localStorage.setItem('drawAndGuessUser', JSON.stringify({
          id: userId,
          name: username,
          roomId: newRoomId,
          isHost: true
        }));
      } else {
        const error = await response.json();
        setUsernameError(error.message || "Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setUsernameError("Failed to connect to the game server");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    // Validate username
    if (!joinUsername.trim()) {
      setUsernameError("Please enter a username");
      return;
    }
    
    // Check if roomId is provided
    if (!roomId.trim()) {
      setUsernameError("Room ID is required");
      return;
    }

    setUsernameError("");
    setIsLoading(true);
    
    try {
      const userId = uuidv4();
      
      // Create user object
      const newUser: User = { 
        id: userId, 
        name: joinUsername, 
        isHost: false 
      };
      
      // Join room on the backend
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: newUser }),
      });

      if (response.ok) {
        // Store user info in localStorage for persistence
        localStorage.setItem('drawAndGuessUser', JSON.stringify({
          id: userId,
          name: joinUsername,
          roomId: roomId,
          isHost: false
        }));
        
        // Navigate to game page
        router.push(`/game/${roomId}`);
      } else {
        const error = await response.json();
        setUsernameError(error.message || "Failed to join room");
      }
    } catch (error) {
      console.error("Error joining room:", error);
      setUsernameError("Failed to connect to the game server");
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = () => {
    router.push(`/game/${roomId}`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Draw & Guess
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The ultimate social drawing and guessing game. Create a room, invite your friends, and let the fun begin!
          </p>
        </div>

        {/* Game Actions */}
        <div className="max-w-xl mx-auto mt-12">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : !roomLink ? (
            <div className="flex flex-col items-center">
              {!showUsernameInput ? (
                <div className="flex flex-col w-full items-center justify-center">
                  <button
                    onClick={() => setShowUsernameInput(true)}
                    className="cursor-pointer group relative w-64 h-14 overflow-hidden bg-indigo-600 text-white text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition duration-300"
                  >
                    <div className="absolute inset-0 w-full h-full transition-all duration-300 group-hover:bg-opacity-20 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <FiPlayCircle className="text-2xl" />
                      <span>Create New Room</span>
                    </div>
                  </button>

                  <div className="mt-8 text-center w-full max-w-md">
                    <p className="text-gray-600 mb-2">Already have a room code?</p>
                    <div className="flex flex-col space-y-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <FiUser className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Your name"
                          value={joinUsername}
                          onChange={(e) => setJoinUsername(e.target.value)}
                          className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder="Enter room ID"
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                          className="w-full px-4 text-black py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                        <button
                          onClick={joinRoom}
                          className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-r-lg hover:bg-indigo-700 transition"
                        >
                          Join
                        </button>
                      </div>
                      {usernameError && <p className="mt-1 text-sm text-red-600">{usernameError}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Create a Room</h3>
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1"></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FiUser className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      />
                    </div>
                    {usernameError && <p className="mt-1 text-sm text-red-600">{usernameError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUsernameInput(false)}
                      className="cursor-pointer flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={createRoom}
                      className="cursor-pointer flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Create Room
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-6 px-6">
                <h2 className="text-white text-xl font-semibold">Room Created Successfully!</h2>
                <p className="text-indigo-100 text-sm mt-1">Share this link with your friends to join the game</p>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <code className="text-gray-700 text-sm flex-1 break-all">{roomLink}</code>
                  <button
                    onClick={() => copyToClipboard(roomLink)}
                    className={`cursor-pointer flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition whitespace-nowrap`}
                  >
                    {copied ? (
                      <>
                        <FiCheck className="text-green-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <FiCopy />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="text-gray-700 font-medium mb-3">Users in Room</h3>
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 mb-4">
                    {users.length > 0 ? (
                      users.map(user => (
                        <div key={user.id} className="flex items-center gap-2 py-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <FiUser className="text-indigo-600" />
                          </div>
                          <span className="text-gray-800">{user.name}</span>
                          {user.isHost && (
                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">Host</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No users in the room yet</p>
                    )}
                  </div>

                  <button
                    onClick={startGame}
                    className="cursor-pointer flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg transition shadow-md"
                  >
                    <FiPlayCircle />
                    <span>Start Game</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Real-time Drawing",
              description: "Express your creativity with our smooth, responsive drawing tools."
            },
            {
              title: "Instant Guessing",
              description: "Type your guesses and get immediate feedback as you play along."
            },
            {
              title: "Play Anywhere",
              description: "No downloads needed - play directly in your browser on any device."
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded-lg mb-4">
                <span className="text-2xl font-bold text-indigo-600">{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}