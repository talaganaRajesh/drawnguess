"use client";

import { useState } from "react";

const Chat = () => {
  const [messages, setMessages] = useState<{ user: string; text: string }[]>(
    []
  );
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (input.trim() === "") return;
    setMessages([...messages, { user: "You", text: input }]);
    setInput("");
  };

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-lg">
      <div className="h-64 overflow-y-auto border-b-2 mb-2">
        {messages.map((msg, index) => (
          <p key={index} className="text-gray-700">
            <strong>{msg.user}: </strong>
            {msg.text}
          </p>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          className="w-full p-2 border rounded-l-lg"
          placeholder="Enter your guess..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 rounded-r-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
