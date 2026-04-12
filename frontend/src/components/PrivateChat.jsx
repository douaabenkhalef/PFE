// frontend/src/components/PrivateChat.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, User, Paperclip, File, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PrivateChat = ({ university, currentUser, targetUser, onClose }) => {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [uploading, setUploading] = useState(false);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio non supporté'));
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  let typingTimeoutRef = useRef(null);
  
  const handleTyping = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    if (!isTyping) {
      setIsTyping(true);
      ws.send(JSON.stringify({
        type: 'typing',
        receiver_id: targetUser?.id,
        is_typing: true
      }));
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      ws.send(JSON.stringify({
        type: 'typing',
        receiver_id: targetUser?.id,
        is_typing: false
      }));
    }, 1000);
  };

  const sendFile = async (file, type) => {
    if (!file) return;
    
    setUploading(true);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      
      if (ws && ws.readyState === WebSocket.OPEN && targetUser) {
        ws.send(JSON.stringify({
          type: 'private_message',
          receiver_id: targetUser.id,
          message: '',
          message_type: type,
          file_data: base64Data,
          file_name: file.name
        }));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux (max 5MB)');
      return;
    }
    
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    sendFile(file, fileType);
    e.target.value = '';
  };

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('❌ No token found');
      return;
    }
    
    const wsUrl = `ws://localhost:8000/ws/private-chat/?token=${token}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('✅ Private chat WebSocket connecté');
      setConnectionStatus('connected');
      
      if (targetUser?.id) {
        socket.send(JSON.stringify({
          type: 'get_history',
          with_user_id: targetUser.id
        }));
      }
    };
    
    socket.onclose = () => {
      console.log('⚠️ Private chat WebSocket déconnecté');
      setConnectionStatus('disconnected');
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    socket.onerror = (error) => {
      console.error('❌ Private chat WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Message reçu:', data.type);
      
      if (data.type === 'private_message') {
        if (data.from_user_id !== user?.id) {
          playNotificationSound();
        }
        
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message_id);
          if (exists) return prev;
          
          return [...prev, {
            id: data.message_id,
            from_user_id: data.from_user_id,
            from_user_name: data.from_user_name,
            message: data.message,
            message_type: data.message_type || 'text',
            file_url: data.file_url,
            file_name: data.file_name,
            timestamp: data.timestamp,
            is_own: data.from_user_id === user?.id,
            is_read: data.is_read
          }];
        });
      } else if (data.type === 'message_sent') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          from_user_id: user?.id,
          from_user_name: user?.username,
          message: data.message,
          message_type: data.message_type || 'text',
          file_url: data.file_url,
          file_name: data.file_name,
          timestamp: data.timestamp,
          is_own: true,
          is_read: false
        }]);
      } else if (data.type === 'history') {
        console.log('📜 Historique reçu:', data.messages.length, 'messages');
        setMessages(data.messages.map(msg => ({
          ...msg,
          is_own: msg.sender_id === user?.id
        })));
      } else if (data.type === 'user_typing') {
        setTypingUsers(prev => ({
          ...prev,
          [data.from_user_id]: data.is_typing
        }));
        
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.from_user_id]: false
          }));
        }, 3000);
      }
    };
    
    setWs(socket);
  }, [targetUser?.id, user?.id, user?.username]);
  
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);
  
  const sendMessage = () => {
    if (inputMessage.trim() && ws && ws.readyState === WebSocket.OPEN && targetUser) {
      ws.send(JSON.stringify({
        type: 'private_message',
        receiver_id: targetUser.id,
        message: inputMessage.trim(),
        message_type: 'text'
      }));
      setInputMessage('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    handleTyping();
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isTypingFromUser = typingUsers[targetUser?.id] || false;
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 px-4 flex justify-between items-center min-w-[200px]">
          <div className="flex items-center gap-2">
            <User size={14} className="text-white" />
            <span className="text-white text-sm font-semibold">{targetUser?.full_name || targetUser?.username}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsMinimized(false)} className="text-white/80 hover:text-white">
              <Maximize2 size={12} />
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transition-all duration-300 flex flex-col" style={{ height: '550px' }}>
      {/* Header - fixed */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <User size={18} className="text-white" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${targetUser?.is_online ? 'bg-green-400' : 'bg-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {targetUser?.full_name || targetUser?.username}
            </h3>
            {isTypingFromUser && (
              <p className="text-xs text-purple-200 animate-pulse">En train d'écrire...</p>
            )}
          </div>
          {connectionStatus === 'connected' && (
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1" />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white/80 hover:text-white transition"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Messages - scrollable */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun message</p>
            <p className="text-xs">Envoyez un message pour commencer la conversation</p>
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
                  <p className="text-xs text-purple-300 mb-1 font-semibold">
                    {msg.from_user_name}
                  </p>
                )}
                
                {/* Message texte */}
                {msg.message_type === 'text' && msg.message && (
                  <p className="text-sm break-words">{msg.message}</p>
                )}
                
                {/* Image */}
                {msg.message_type === 'image' && msg.file_url && (
                  <div className="mt-1">
                    <img 
                      src={`http://localhost:8000${msg.file_url}`}
                      alt={msg.file_name}
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(`http://localhost:8000${msg.file_url}`, '_blank')}
                    />
                    <p className="text-xs mt-1 opacity-70">{msg.file_name}</p>
                  </div>
                )}
                
                {/* Fichier */}
                {msg.message_type === 'file' && msg.file_url && (
                  <div className="mt-1">
                    <a 
                      href={`http://localhost:8000${msg.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm bg-slate-600/50 rounded-lg p-2 hover:bg-slate-600 transition"
                    >
                      <File size={16} />
                      <span className="truncate max-w-[150px]">{msg.file_name}</span>
                    </a>
                  </div>
                )}
                
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className={`text-xs ${msg.is_own ? 'text-purple-200' : 'text-slate-400'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                  {msg.is_own && msg.is_read && (
                    <span className="text-xs text-green-400">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isTypingFromUser && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg p-2 px-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input - fixed at bottom */}
      <div className="p-4 border-t border-slate-700 flex gap-2 flex-shrink-0">
        <input
          type="file"
          id="private-file-input"
          accept="image/*, .pdf, .doc, .docx, .txt"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="private-file-input"
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg cursor-pointer transition"
          title="Envoyer un fichier"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </label>
        
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Message pour ${targetUser?.full_name || targetUser?.username}...`}
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
    </div>
  );
};

export default PrivateChat;