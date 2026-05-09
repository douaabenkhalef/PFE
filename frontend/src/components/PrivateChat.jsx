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
    audio.play().catch(e => console.log('Audio not supported'));
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
      alert('File is too large (max 5MB)');
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
    
    const wsUrl = `wss://pfe-l31r.onrender.com/ws/private-chat/?token=${token}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('✅ Private chat WebSocket connected');
      setConnectionStatus('connected');
      
      if (targetUser?.id) {
        socket.send(JSON.stringify({
          type: 'get_history',
          with_user_id: targetUser.id
        }));
      }
    };
    
    socket.onclose = () => {
      console.log('⚠️ Private chat WebSocket disconnected');
      setConnectionStatus('disconnected');
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    socket.onerror = (error) => {
      console.error('❌ Private chat WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Message received:', data.type);
      
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
        console.log('📜 History received:', data.messages.length, 'messages');
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
      <div className="private-chat-minimized">
        <div className="private-chat-minimized-header">
          <div className="private-chat-minimized-header-left">
            <User size={14} className="text-white" />
            <span className="private-chat-minimized-name">{targetUser?.full_name || targetUser?.username}</span>
          </div>
          <div className="private-chat-minimized-actions">
            <button onClick={() => setIsMinimized(false)} className="private-chat-minimized-btn">
              <Maximize2 size={12} />
            </button>
            <button onClick={onClose} className="private-chat-minimized-btn">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="private-chat-window">
      {/* Header */}
      <div className="private-chat-header">
        <div className="private-chat-header-left">
          <div className="private-chat-avatar">
            <User size={18} className="text-white" />
            <div className={`private-chat-status ${targetUser?.is_online ? 'online' : 'offline'}`} />
          </div>
          <div className="private-chat-user-info">
            <h3 className="private-chat-user-name">
              {targetUser?.full_name || targetUser?.username}
            </h3>
            {isTypingFromUser && (
              <p className="private-chat-typing">Typing...</p>
            )}
          </div>
          {connectionStatus === 'connected' && (
            <span className="private-chat-connection-dot" />
          )}
        </div>
        <div className="private-chat-header-actions">
          <button onClick={() => setIsMinimized(true)} className="private-chat-header-btn">
            <Minimize2 size={16} />
          </button>
          <button onClick={onClose} className="private-chat-header-btn">
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="private-chat-messages"
      >
        {messages.length === 0 ? (
          <div className="private-chat-empty">
            <MessageCircle size={32} className="private-chat-empty-icon" />
            <p className="private-chat-empty-text">No messages yet</p>
            <p className="private-chat-empty-subtext">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`private-chat-message ${msg.is_own ? 'own' : 'other'}`}
            >
              <div className={`private-chat-bubble ${msg.is_own ? 'own' : 'other'}`}>
                {!msg.is_own && (
                  <p className="private-chat-bubble-name">
                    {msg.from_user_name}
                  </p>
                )}
                
                {/* Text message */}
                {msg.message_type === 'text' && msg.message && (
                  <p className="private-chat-bubble-text">{msg.message}</p>
                )}
                
                {/* Image */}
                {msg.message_type === 'image' && msg.file_url && (
                  <div className="private-chat-image-container">
                    <img 
                      src={`https://pfe-l31r.onrender.com${msg.file_url}`}
                      alt={msg.file_name}
                      className="private-chat-image"
                      onClick={() => window.open(`https://pfe-l31r.onrender.com${msg.file_url}`, '_blank')}
                    />
                    <p className="private-chat-image-name">{msg.file_name}</p>
                  </div>
                )}
                
                {/* File */}
                {msg.message_type === 'file' && msg.file_url && (
                  <div className="private-chat-file-container">
                    <a 
                      href={`https://pfe-l31r.onrender.com${msg.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="private-chat-file-link"
                    >
                      <File size={16} />
                      <span className="private-chat-file-name">{msg.file_name}</span>
                    </a>
                  </div>
                )}
                
                <div className="private-chat-bubble-footer">
                  <p className={`private-chat-time ${msg.is_own ? 'own' : 'other'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                  {msg.is_own && msg.is_read && (
                    <span className="private-chat-read">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isTypingFromUser && (
          <div className="private-chat-typing-indicator">
            <div className="private-chat-typing-bubble">
              <div className="private-chat-typing-dots">
                <span className="private-chat-typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="private-chat-typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="private-chat-typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="private-chat-input-area">
        <input
          type="file"
          id="private-file-input"
          accept="image/*, .pdf, .doc, .docx, .txt"
          className="private-chat-file-input"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="private-file-input"
          className="private-chat-attach-btn"
          title="Send file"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </label>
        
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Message to ${targetUser?.full_name || targetUser?.username}...`}
          className="private-chat-input"
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
          className="private-chat-send-btn"
        >
          <Send size={18} />
        </button>
      </div>

      <style>{`
        /* ===== PRIVATE CHAT STYLES ===== */
        
        /* Minimized state */
        .private-chat-minimized {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          background: #1e293b;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(141, 35, 212, 0.3);
          overflow: hidden;
        }
        .private-chat-minimized-header {
          background: linear-gradient(135deg, #8D23D4, #F75AFA);
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-width: 200px;
        }
        .private-chat-minimized-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .private-chat-minimized-name {
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .private-chat-minimized-actions {
          display: flex;
          gap: 8px;
        }
        .private-chat-minimized-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: color 0.2s;
        }
        .private-chat-minimized-btn:hover {
          color: white;
        }
        
        /* Main chat window */
        .private-chat-window {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          width: 384px;
          background: #1e293b;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(141, 35, 212, 0.3);
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 550px;
        }
        
        /* Header */
        .private-chat-header {
          background: linear-gradient(135deg, #8D23D4, #F75AFA);
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .private-chat-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .private-chat-avatar {
          position: relative;
        }
        .private-chat-status {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .private-chat-status.online {
          background: #10b981;
        }
        .private-chat-status.offline {
          background: #9ca3af;
        }
        .private-chat-user-info {
          margin-left: 4px;
        }
        .private-chat-user-name {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          margin: 0;
        }
        .private-chat-typing {
          color: #d8b4fe;
          font-size: 0.7rem;
          margin: 0;
          animation: pulse 1.5s infinite;
        }
        .private-chat-connection-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          margin-left: 4px;
        }
        .private-chat-header-actions {
          display: flex;
          gap: 8px;
        }
        .private-chat-header-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: color 0.2s;
        }
        .private-chat-header-btn:hover {
          color: white;
        }
        
        /* Messages area */
        .private-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(15, 23, 42, 0.5);
          min-height: 0;
        }
        .private-chat-empty {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          padding: 32px 0;
        }
        .private-chat-empty-icon {
          margin: 0 auto 8px;
          opacity: 0.3;
        }
        .private-chat-empty-text {
          font-size: 0.875rem;
          margin: 0;
        }
        .private-chat-empty-subtext {
          font-size: 0.75rem;
          margin: 0;
        }
        
        /* Message bubbles */
        .private-chat-message {
          display: flex;
        }
        .private-chat-message.own {
          justify-content: flex-end;
        }
        .private-chat-message.other {
          justify-content: flex-start;
        }
        .private-chat-bubble {
          max-width: 70%;
          border-radius: 12px;
          padding: 12px;
        }
        .private-chat-bubble.own {
          background: #8D23D4;
          color: white;
        }
        .private-chat-bubble.other {
          background: #334155;
          color: white;
        }
        .private-chat-bubble-name {
          font-size: 0.7rem;
          color: #c084fc;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .private-chat-bubble-text {
          font-size: 0.875rem;
          margin: 0;
          word-break: break-word;
        }
        .private-chat-image-container {
          margin-top: 4px;
        }
        .private-chat-image {
          max-width: 100%;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .private-chat-image:hover {
          opacity: 0.9;
        }
        .private-chat-image-name {
          font-size: 0.7rem;
          margin-top: 4px;
          opacity: 0.7;
        }
        .private-chat-file-container {
          margin-top: 4px;
        }
        .private-chat-file-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px;
          text-decoration: none;
          color: white;
          transition: background 0.2s;
        }
        .private-chat-file-link:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .private-chat-file-name {
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        .private-chat-bubble-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
        }
        .private-chat-time {
          font-size: 0.6rem;
        }
        .private-chat-time.own {
          color: #d8b4fe;
        }
        .private-chat-time.other {
          color: #94a3b8;
        }
        .private-chat-read {
          font-size: 0.6rem;
          color: #10b981;
        }
        
        /* Typing indicator */
        .private-chat-typing-indicator {
          display: flex;
          justify-content: flex-start;
        }
        .private-chat-typing-bubble {
          background: #334155;
          border-radius: 12px;
          padding: 8px 12px;
        }
        .private-chat-typing-dots {
          display: flex;
          gap: 4px;
        }
        .private-chat-typing-dot {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Input area */
        .private-chat-input-area {
          padding: 16px;
          border-top: 1px solid rgba(141, 35, 212, 0.2);
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          background: #1e293b;
        }
        .private-chat-file-input {
          display: none;
        }
        .private-chat-attach-btn {
          background: #334155;
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          color: white;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .private-chat-attach-btn:hover {
          background: #475569;
        }
        .private-chat-input {
          flex: 1;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 0.875rem;
          resize: none;
          outline: none;
        }
        .private-chat-input:focus {
          border-color: #8D23D4;
        }
        .private-chat-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .private-chat-send-btn {
          background: #8D23D4;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          color: white;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .private-chat-send-btn:hover:not(:disabled) {
          opacity: 0.85;
        }
        .private-chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Scrollbar */
        .private-chat-messages::-webkit-scrollbar {
          width: 4px;
        }
        .private-chat-messages::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .private-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(141, 35, 212, 0.4);
          border-radius: 4px;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 480px) {
          .private-chat-window {
            width: 90%;
            right: 5%;
            left: 5%;
            bottom: 16px;
            height: 500px;
          }
          .private-chat-minimized {
            right: 16px;
            bottom: 16px;
          }
          .private-chat-bubble {
            max-width: 85%;
          }
          .private-chat-file-name {
            max-width: 120px;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .private-chat-window {
          background: #ffffff;
          border-color: rgba(141, 35, 212, 0.3);
        }
        body.light-mode .private-chat-messages {
          background: #f8fafc;
        }
        body.light-mode .private-chat-bubble.other {
          background: #e2e8f0;
          color: #1a1a2e;
        }
        body.light-mode .private-chat-bubble.own {
          background: #8D23D4;
          color: white;
        }
        body.light-mode .private-chat-bubble-name {
          color: #8D23D4;
        }
        body.light-mode .private-chat-time.other {
          color: #64748b;
        }
        body.light-mode .private-chat-typing-bubble {
          background: #e2e8f0;
        }
        body.light-mode .private-chat-typing-dot {
          background: #94a3b8;
        }
        body.light-mode .private-chat-input-area {
          background: #ffffff;
        }
        body.light-mode .private-chat-input {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #1a1a2e;
        }
        body.light-mode .private-chat-input::placeholder {
          color: #94a3b8;
        }
        body.light-mode .private-chat-attach-btn {
          background: #e2e8f0;
          color: #1a1a2e;
        }
        body.light-mode .private-chat-attach-btn:hover {
          background: #cbd5e1;
        }
        body.light-mode .private-chat-empty-text,
        body.light-mode .private-chat-empty-subtext {
          color: #64748b;
        }
        body.light-mode .private-chat-empty-icon {
          color: #cbd5e1;
        }
        body.light-mode .private-chat-minimized {
          background: #ffffff;
          border-color: rgba(141, 35, 212, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PrivateChat;