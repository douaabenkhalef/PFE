// frontend/src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChatWidget = ({ university }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('❌ No token found, cannot connect WebSocket');
      return;
    }
    
    // Utiliser un nom fixe sans accent pour éviter les erreurs Channels
    const wsUrl = `ws://localhost:8000/ws/chat/Universite/?token=${token}`;
    
    console.log("🔵 Connecting to WebSocket:", wsUrl);
    console.log("🔵 User:", user?.email);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connecté');
      setConnectionStatus('connected');
    };
    
    socket.onclose = () => {
      console.log('⚠️ WebSocket déconnecté, tentative de reconnexion...');
      setConnectionStatus('disconnected');
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    socket.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
      setConnectionStatus('error');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Message reçu:', data.type);
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          username: data.username,
          full_name: data.full_name,
          message: data.message,
          timestamp: data.timestamp,
          user_id: data.user_id,
          is_own: data.user_id === user?.id
        }]);
      } else if (data.type === 'history') {
        setMessages(data.messages.map(msg => ({
          ...msg,
          is_own: msg.user_id === user?.id
        })));
      } else if (data.type === 'user_online') {
        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.username !== data.username);
          return [...filtered, { username: data.username, full_name: data.full_name }];
        });
      } else if (data.type === 'user_offline') {
        setOnlineUsers(prev => prev.filter(u => u.username !== data.username));
      }
    };
    
    setWs(socket);
  }, [user?.email, user?.id]);
  
  useEffect(() => {
    if (isOpen && !ws) {
      connectWebSocket();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isOpen, connectWebSocket, ws]);
  
  const sendMessage = () => {
    if (inputMessage.trim() && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        message: inputMessage.trim()
      }));
      setInputMessage('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Bouton flottant toujours visible si le chat est fermé
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <MessageCircle size={24} />
        {onlineUsers.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {onlineUsers.length}
          </span>
        )}
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-white" />
          <h3 className="text-white font-semibold">Chat Université</h3>
          {connectionStatus === 'connected' && (
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white transition"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {/* Online users */}
          <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
            <Users size={14} className="text-green-400" />
            <span className="text-white/70 text-sm">
              {onlineUsers.length} membre{onlineUsers.length > 1 ? 's' : ''} en ligne
            </span>
            <div className="flex gap-1 ml-2">
              {onlineUsers.slice(0, 3).map(u => (
                <span key={u.username} className="text-xs text-purple-300">
                  {u.full_name || u.username}
                </span>
              ))}
              {onlineUsers.length > 3 && (
                <span className="text-xs text-white/50">+{onlineUsers.length - 3}</span>
              )}
            </div>
          </div>
          
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
            {messages.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun message</p>
                <p className="text-xs">Soyez le premier à envoyer un message</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.is_own
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {!msg.is_own && (
                      <p className="text-xs text-purple-300 mb-1">
                        {msg.full_name || msg.username}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.is_own ? 'text-purple-200' : 'text-slate-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-slate-700 flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Écrivez votre message..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWidget;