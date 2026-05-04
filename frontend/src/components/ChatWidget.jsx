// frontend/src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, Users, Building2, GraduationCap, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChatWidget = ({ university, companyMode = false, companyId = null, internshipId = null, onClose }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [groupInfo, setGroupInfo] = useState(null);
  const [companyRoomName, setCompanyRoomName] = useState(null);

  // ✅ Auto-open chat when internshipId is provided
  useEffect(() => {
    if (internshipId && !isOpen) {
      console.log("🚀 Opening chat automatically for internship:", internshipId);
      setIsOpen(true);
    }
  }, [internshipId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCloseChat = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    setWs(null);
    setIsOpen(false);
    setIsMinimized(false);
    setMessages([]);
    setOnlineUsers([]);
    setConnectionStatus('disconnected');
    if (onClose) {
      onClose();
    }
  };

  const fetchCompanyName = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/auth/me/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        let name = data.user.company_name;
        if (!name && data.user.user && data.user.user.company_name) {
          name = data.user.user.company_name;
        }
        if (name) {
          const cleanName = name.replace(/\s/g, '_');
          setCompanyRoomName(cleanName);
          return cleanName;
        }
      }
      setCompanyRoomName('company');
      return 'company';
    } catch (err) {
      console.error('Error fetching company name:', err);
      setCompanyRoomName('company');
      return 'company';
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('❌ No token found, cannot connect WebSocket');
      return;
    }

    let wsUrl;
    let groupName;

    if (user?.role === 'admin') {
      const uniName = university || (user?.university || "Universite");
      groupName = uniName.replace(/\s/g, '_');
      wsUrl = `ws://localhost:8000/ws/chat/${groupName}/?token=${token}`;
      setGroupInfo({ type: 'university', name: uniName, icon: '🎓', title: `Chat ${uniName}` });
    } 
    else if (user?.role === 'company') {
      let roomName = companyRoomName;
      if (!roomName) {
        roomName = await fetchCompanyName();
      }
      const finalRoomName = roomName || 'company';
      wsUrl = `ws://localhost:8000/ws/company-chat/${finalRoomName}/?token=${token}`;
      setGroupInfo({ type: 'company', name: finalRoomName, icon: '🏢', title: `Chat` });
    }
    else if (user?.role === 'student' && internshipId) {
      wsUrl = `ws://localhost:8000/ws/internship-chat/${internshipId}/?token=${token}`;
      setGroupInfo({ type: 'internship', name: `Stage`, icon: '💼', title: `Chat Stage` });
    }
    else {
      console.log('❌ No valid chat configuration');
      return;
    }

    console.log(`🔵 Connecting to WebSocket: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connecté');
      setConnectionStatus('connected');
    };
    
    socket.onclose = () => {
      console.log('⚠️ WebSocket déconnecté');
      setConnectionStatus('disconnected');
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
  }, [user?.role, user?.company_name, user?.university, user?.id, university, internshipId, companyRoomName, fetchCompanyName]);

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

  const getHeaderIcon = () => {
    if (groupInfo?.type === 'university') return <GraduationCap size={16} className="text-white" />;
    if (groupInfo?.type === 'company') return <Building2 size={16} className="text-white" />;
    if (groupInfo?.type === 'internship') return <Briefcase size={16} className="text-white" />;
    return <MessageCircle size={16} className="text-white" />;
  };

  // Don't show anything for student without internshipId
  if (user?.role === 'student' && !internshipId) {
    return null;
  }

  // Closed state - show chat button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        {getHeaderIcon()}
        {onlineUsers.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {onlineUsers.length}
          </span>
        )}
      </button>
    );
  }
  
  // Open state - show chat window
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-[#1e293b] rounded-xl shadow-2xl border border-slate-700 overflow-hidden transition-all duration-300">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2.5 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          {getHeaderIcon()}
          <h3 className="text-white font-semibold text-sm">{groupInfo?.title || 'Chat'}</h3>
          {connectionStatus === 'connected' && (
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white transition"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={handleCloseChat}
            className="text-white/80 hover:text-white transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="bg-slate-800/50 px-3 py-1.5 border-b border-slate-700 flex items-center gap-1.5">
            <Users size={12} className="text-green-400" />
            <span className="text-white/70 text-xs">
              {onlineUsers.length} membre{onlineUsers.length > 1 ? 's' : ''} en ligne
            </span>
            <div className="flex gap-1 ml-1 flex-wrap">
              {onlineUsers.slice(0, 2).map(u => (
                <span key={u.username} className="text-[10px] text-purple-300">
                  {u.full_name || u.username}
                </span>
              ))}
              {onlineUsers.length > 2 && (
                <span className="text-[10px] text-white/50">+{onlineUsers.length - 2}</span>
              )}
            </div>
          </div>
          
          <div className="h-72 overflow-y-auto p-2 space-y-2 bg-slate-900/50">
            {messages.length === 0 ? (
              <div className="text-center text-white/40 py-6">
                <MessageCircle size={24} className="mx-auto mb-1 opacity-30" />
                <p className="text-xs">Aucun message</p>
                <p className="text-[10px]">Soyez le premier à envoyer un message</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 text-sm ${
                      msg.is_own
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {!msg.is_own && (
                      <p className="text-[10px] text-purple-300 mb-0.5">
                        {msg.full_name || msg.username}
                      </p>
                    )}
                    <p className="text-xs break-words">{msg.message}</p>
                    <p className={`text-[10px] mt-0.5 ${msg.is_own ? 'text-purple-200' : 'text-slate-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-2 border-t border-slate-700 flex gap-1.5">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs resize-none focus:outline-none focus:border-purple-500"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg transition"
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWidget;