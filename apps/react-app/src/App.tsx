import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, User, Bot } from "lucide-react";

const HTTP_ENDPOINT = "http://localhost:3001";
const WS_ENDPOINT = "ws://localhost:8080";

const App = () => {
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    //@ts-ignore
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchInitialMessages = async () => {
      try {
        const token = localStorage.getItem("jwt_token");
        const response = await fetch(`${HTTP_ENDPOINT}/messages?mode=all`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `${token}` }),
          },
        });

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to fetch initial messages:", err);
      }
    };

    fetchInitialMessages();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_ENDPOINT}?token=${localStorage.getItem("jwt_token")}`
    );
    //@ts-ignore
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        //@ts-ignore
        setMessages((prev) => [
          ...prev,
          { message: data.latest_ai_response, isAI: true },
        ]);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
        setIsLoading(false);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleUserInput = () => {
    //@ts-ignore
    const value = inputRef.current?.value?.trim();
    if (!value || !wsRef.current) return;

    const obj = {
      //@ts-ignore
      previous_ai_response: messages[messages.length - 1]?.message || "",
      player_action: value,
    };

    //@ts-ignore
    wsRef.current.send(JSON.stringify(obj));
    //@ts-ignore
    setMessages((prev) => [...prev, { message: value, isAI: false }]);
    setIsLoading(true);
    //@ts-ignore
    inputRef.current.value = "";
  };

  //@ts-ignore
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  };

  //@ts-ignore
  const MessageBubble = ({ message, isAI }) => (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`flex items-start max-w-xs lg:max-w-md ${isAI ? "flex-row" : "flex-row-reverse"}`}
      >
        <div className={`flex-shrink-0 ${isAI ? "mr-3" : "ml-3"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAI ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"
            }`}
          >
            {isAI ? <Bot size={16} /> : <User size={16} />}
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isAI
              ? "bg-gray-100 text-gray-900 rounded-bl-sm"
              : "bg-blue-500 text-white rounded-br-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
      </div>
    </div>
  );

  const LoadingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="flex items-start max-w-xs lg:max-w-md">
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
            <Bot size={16} />
          </div>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <MessageCircle className="text-blue-500" size={24} />
            <h1 className="text-xl font-semibold text-gray-900">
              Chat Interface
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
            ></div>
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">
                Start a conversation by typing a message below
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble
                key={index}
                //@ts-ignore
                message={msg.message}
                //@ts-ignore
                isAI={msg.isAI !== false} 
              />
            ))
          )}
          {isLoading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="What do you do?"
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleUserInput}
              disabled={!isConnected || isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg p-3 transition-colors duration-200"
            >
              <Send size={20} />
            </button>
          </div>
          {!isConnected && (
            <p className="text-red-500 text-sm mt-2 text-center">
              Connection lost. Please refresh the page to reconnect.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
