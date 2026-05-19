import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Minimize2, Users, 
  Search, MessageSquare, ArrowLeft, Loader2, Paperclip, File,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'https://pfe-l31r.onrender.com/api';
const WS_BASE = 'wss://pfe-l31r.onrender.com';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const token = () => localStorage.getItem('access_token');


const MessageItem = ({ message, isOwn, showAvatar, senderName }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            {senderName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      )}
      <div className={`max-w-[75%] ${!isOwn && !showAvatar ? 'ml-10' : ''}`}>
        {!isOwn && (
          <p className="text-xs text-purple-300 mb-0.5 ml-1">{senderName}</p>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? 'bg-purple-600 text-white rounded-br-sm'
              : 'bg-slate-700 text-white rounded-bl-sm'
          }`}
        >
          {message.message_type === 'image' && message.file_url && (
            <img 
              src={`https://pfe-l31r.onrender.com${message.file_url}`}
              alt="Shared"
              className="max-w-full rounded-lg mb-1 cursor-pointer"
              onClick={() => window.open(`https://pfe-l31r.onrender.com${message.file_url}`, '_blank')}
            />
          )}
          {message.message_type === 'file' && message.file_url && (
            <a 
              href={`https://pfe-l31r.onrender.com${message.file_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm bg-slate-600/50 rounded-lg p-2 hover:bg-slate-600 transition"
            >
              <File size={14} />
              <span className="truncate max-w-[150px]">{message.file_name || 'Fichier'}</span>
            </a>
          )}
          {message.message_type !== 'image' && message.message_type !== 'file' && (
            <p className="break-words whitespace-pre-wrap">{message.message}</p>
          )}
          <p className={`text-[10px] mt-1 ${isOwn ? 'text-purple-200' : 'text-slate-400'}`}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};


// ChatWindow modifié pour supporter les groupes
const ChatWindow = ({ 
  conversation, 
  onBack, 
  user, 
  onClose: onCloseWindow,
  onConversationUpdate,
  onMarkAsRead 
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [uploading, setUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (onMarkAsRead && conversation.id) {
      onMarkAsRead(conversation.id);
    }
  }, [conversation.id]);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const getWebSocketUrl = () => {
    const accessToken = token();
    if (!accessToken) return null;

    if (conversation.type === 'university_group') {
      const encodedUniv = encodeURIComponent(conversation.group_id);
      return `${WS_BASE}/ws/university-group/${encodedUniv}/?token=${accessToken}`;
    } else if (conversation.type === 'private') {
      return `${WS_BASE}/ws/private-chat/?token=${accessToken}`;
    }
    return null;
  };

  const connectWebSocket = useCallback(() => {
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnectionStatus('connected');
      if (conversation.type === 'private' && conversation.user_id) {
        socket.send(JSON.stringify({
          type: 'get_history',
          with_user_id: conversation.user_id
        }));
      }
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      setTimeout(() => connectWebSocket(), 3000);
    };

    socket.onerror = () => {
      setConnectionStatus('error');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'private_message') {
        const newMessage = {
          id: data.message_id || Date.now(),
          from_user_id: data.from_user_id || data.user_id,
          from_user_name: data.full_name || data.from_user_name || data.username,
          message: data.message,
          message_type: data.message_type || 'text',
          file_url: data.file_url,
          file_name: data.file_name,
          timestamp: data.timestamp || new Date().toISOString(),
          is_own: (data.from_user_id || data.user_id) === user?.id,
          is_read: data.is_read || false
        };
        
        if (!newMessage.is_own) {
          playNotificationSound();
        }
        
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        
        if (onConversationUpdate) {
          onConversationUpdate(conversation.id, newMessage);
        }
      } else if (data.type === 'message' || data.type === 'group_message') {
        const newMessage = {
          id: data.message_id || Date.now(),
          from_user_id: data.sender_id || data.user_id,
          from_user_name: data.full_name || data.sender_name || data.username,
          message: data.message,
          message_type: data.message_type || 'text',
          file_url: data.file_url,
          file_name: data.file_name,
          timestamp: data.timestamp || new Date().toISOString(),
          is_own: (data.sender_id || data.user_id) === user?.id,
          is_read: false
        };
        
        if (!newMessage.is_own) {
          playNotificationSound();
        }
        
        setMessages(prev => [...prev, newMessage]);
        
        if (onConversationUpdate) {
          onConversationUpdate(conversation.id, newMessage);
        }
      } else if (data.type === 'history') {
        setMessages(data.messages.map(msg => ({
          ...msg,
          id: msg.id || Date.now(),
          is_own: msg.sender_id === user?.id || msg.user_id === user?.id,
          from_user_name: msg.full_name || msg.username || msg.sender_name
        })));
      } else if (data.type === 'user_online') {
        setOnlineUsers(prev => {
          if (prev.some(u => u.username === data.username)) return prev;
          return [...prev, { username: data.username, full_name: data.full_name }];
        });
      } else if (data.type === 'user_offline') {
        setOnlineUsers(prev => prev.filter(u => u.username !== data.username));
      } else if (data.type === 'user_typing') {
        setTypingUsers(prev => ({ ...prev, [data.from_user_id]: data.is_typing }));
        setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [data.from_user_id]: false }));
        }, 3000);
      }
    };

    setWs(socket);
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [conversation, user?.id, onConversationUpdate]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => cleanup?.();
  }, [connectWebSocket]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    let messageData;
    if (conversation.type === 'private') {
      messageData = {
        type: 'private_message',
        message: inputMessage.trim(),
        message_type: 'text',
        receiver_id: conversation.user_id
      };
    } else {
      messageData = {
        type: 'message',
        message: inputMessage.trim(),
        message_type: 'text'
      };
    }
    
    ws.send(JSON.stringify(messageData));
    setInputMessage('');
  };

  const handleTyping = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    if (!isTyping) {
      setIsTyping(true);
      const typingData = {
        type: 'typing',
        is_typing: true
      };
      if (conversation.type === 'private' && conversation.user_id) {
        typingData.receiver_id = conversation.user_id;
      }
      ws.send(JSON.stringify(typingData));
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      const typingData = {
        type: 'typing',
        is_typing: false
      };
      if (conversation.type === 'private' && conversation.user_id) {
        typingData.receiver_id = conversation.user_id;
      }
      ws.send(JSON.stringify(typingData));
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    handleTyping();
  };

  const sendFile = async (file, type) => {
    if (!file || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      let messageData;
      if (conversation.type === 'private') {
        messageData = {
          type: 'private_message',
          message: '',
          message_type: type,
          file_data: reader.result,
          file_name: file.name,
          receiver_id: conversation.user_id
        };
      } else {
        messageData = {
          type: 'message',
          message: '',
          message_type: type,
          file_data: reader.result,
          file_name: file.name
        };
      }
      ws.send(JSON.stringify(messageData));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Fichier trop volumineux (max 5MB)');
      return;
    }
    
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    sendFile(file, fileType);
    e.target.value = '';
  };

  const isTypingFromUser = typingUsers[conversation.user_id] || false;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 flex items-center gap-2 flex-shrink-0">
        <button onClick={onBack} className="text-white/80 hover:text-white transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">{conversation.name}</h3>
          {conversation.type === 'university_group' && (
            <p className="text-white/60 text-xs">{conversation.member_count || 0} membres</p>
          )}
          {conversation.type === 'private' && (
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${conversation.is_online ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-white/60 text-xs">
                {conversation.is_online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          )}
        </div>
        <button onClick={onCloseWindow} className="text-white/80 hover:text-white transition">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-slate-900/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <MessageCircle size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Aucun message</p>
            <p className="text-xs">Soyez le premier à envoyer un message</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const showAvatar = !msg.is_own && 
              (idx === 0 || messages[idx - 1]?.from_user_id !== msg.from_user_id);
            return (
              <MessageItem
                key={msg.id || idx}
                message={msg}
                isOwn={msg.is_own}
                showAvatar={showAvatar}
                senderName={msg.from_user_name}
              />
            );
          })
        )}
        {isTypingFromUser && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg p-2 px-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-slate-700 flex gap-2 flex-shrink-0 bg-slate-800/50">
        <input
          type="file"
          id="admin-chat-file-input"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="admin-chat-file-input"
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg cursor-pointer transition"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </label>
        
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
    </div>
  );
};


const ConversationItem = ({ conversation, isActive, onClick, lastMessage }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getIcon = () => {
    if (conversation.type === 'university_group') return <GraduationCap size={14} className="text-purple-400" />;
    return null;
  };

  return (
    <button
      onClick={() => onClick(conversation)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
        isActive
          ? 'bg-purple-600/30 border border-purple-500/30'
          : 'hover:bg-white/10'
      }`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {conversation.type === 'private' ? (
            conversation.avatar || conversation.name?.charAt(0).toUpperCase() || 'U'
          ) : (
            getIcon() || <Users size={18} />
          )}
        </div>
        {conversation.type === 'private' && conversation.is_online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800" />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-1.5">
            {conversation.type !== 'private' && getIcon()}
            <p className="text-white font-medium text-sm truncate">{conversation.name}</p>
          </div>
          {lastMessage && (
            <span className="text-white/40 text-[10px] flex-shrink-0 ml-2">
              {formatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-white/50 text-xs truncate">
            {lastMessage.is_own ? 'Vous: ' : ''}
            {lastMessage.message_type === 'image' ? '📷 Image' :
             lastMessage.message_type === 'file' ? '📎 Fichier' :
             lastMessage.message}
          </p>
        )}
        {conversation.type === 'university_group' && conversation.member_count && (
          <p className="text-white/40 text-[10px] mt-0.5 flex items-center gap-1">
            <Users size={8} /> {conversation.member_count} membres
          </p>
        )}
      </div>
      {conversation.unread_count > 0 && (
        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
        </div>
      )}
    </button>
  );
};


const AdminMemberItem = ({ member, onClick, isCurrentUser }) => {
  const roleLabel = member.sub_role === 'admin' ? 'Department Head' : 'Co Department Head';
  
  return (
    <button
      onClick={() => !isCurrentUser && onClick(member)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
        !isCurrentUser ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default opacity-70'
      }`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
          {member.full_name?.charAt(0).toUpperCase() || member.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        {member.is_online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800" />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-medium text-sm">{member.full_name || member.username}</p>
        <p className="text-white/40 text-xs">
          {roleLabel}
          {isCurrentUser && ' (Vous)'}
        </p>
      </div>
    </button>
  );
};


const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
    />
  </div>
);


const AdminChatWidget = ({ university, onClose: externalOnClose }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [universityGroup, setUniversityGroup] = useState(null);

  // Charger les informations du groupe universitaire
  const fetchUniversityGroupInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/university-group/info/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.group) {
        setUniversityGroup(data.group);
        return {
          id: `university_group_${data.group.id.replace(/ /g, '_')}`,
          name: data.group.name,
          type: 'university_group',
          group_id: data.group.id,
          member_count: data.group.member_count,
          unread_count: 0,
          avatar: 'U'
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching university group info:', err);
      return null;
    }
  }, []);

  const loadExistingConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/private-chat/conversations/`, { headers: authHeaders() });
      const data = await res.json();
      
      if (data.success && data.conversations) {
        const convos = data.conversations.map(conv => ({
          id: `private_${conv.user_id}`,
          name: conv.full_name || conv.username,
          type: 'private',
          user_id: conv.user_id,
          is_online: conv.is_online || false,
          unread_count: conv.unread_count || 0,
          avatar: (conv.full_name || conv.username)?.charAt(0).toUpperCase() || 'U',
          last_message: conv.last_message,
          last_message_time: conv.last_message_time
        }));
        
        convos.forEach(conv => {
          if (conv.last_message) {
            setLastMessages(prev => ({
              ...prev,
              [conv.id]: {
                message: conv.last_message,
                timestamp: conv.last_message_time,
                message_type: 'text'
              }
            }));
          }
        });
        
        return convos;
      }
      return [];
    } catch (err) {
      console.error('Error loading conversations:', err);
      return [];
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/university-users-status/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const members = data.users.map(member => ({
          id: member.id,
          username: member.username,
          email: member.email,
          full_name: member.full_name,
          sub_role: member.sub_role,
          is_online: member.is_online,
          avatar: member.avatar
        }));
        setTeamMembers(members);
        return members;
      }
      return [];
    } catch (err) {
      console.error('Error fetching team members:', err);
      return [];
    }
  }, []);

  const loadAllConversations = useCallback(async () => {
    setLoading(true);
    try {
      const privateConversations = await loadExistingConversations();
      const groupConversation = await fetchUniversityGroupInfo();
      
      if (groupConversation) {
        setConversations([groupConversation, ...privateConversations]);
      } else {
        setConversations([...privateConversations]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [loadExistingConversations, fetchUniversityGroupInfo]);

  useEffect(() => {
    if (user?.role === 'admin' && (user?.sub_role === 'admin' || user?.sub_role === 'co_dept_head')) {
      const init = async () => {
        await fetchTeamMembers();
        await loadAllConversations();
      };
      init();
    } else {
      setLoading(false);
    }
  }, [user?.role, user?.sub_role, fetchTeamMembers, loadAllConversations]);

  const handleCloseChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setActiveConversation(null);
    if (externalOnClose) {
      externalOnClose();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleConversationClick = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    if (user?.role === 'admin') {
      loadAllConversations();
    }
  };

  const handleConversationUpdate = (conversationId, message) => {
    setLastMessages(prev => ({
      ...prev,
      [conversationId]: {
        message: message.message,
        timestamp: message.timestamp,
        is_own: message.is_own,
        message_type: message.message_type
      }
    }));
  };

  const handleMarkConversationAsRead = (conversationId) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
    ));
  };

  const handleStartPrivateChat = async (member) => {
    if (member.id === user?.id) return; 
    
    const existingConv = conversations.find(c => c.type === 'private' && c.user_id === member.id);
    if (existingConv) {
      setConversations(prev => prev.map(conv => 
        conv.id === existingConv.id ? { ...conv, unread_count: 0 } : conv
      ));
      setActiveConversation(existingConv);
    } else {
      const newConversation = {
        id: `private_${member.id}`,
        name: member.full_name || member.username,
        type: 'private',
        user_id: member.id,
        is_online: member.is_online,
        unread_count: 0,
        avatar: (member.full_name || member.username)?.charAt(0).toUpperCase() || 'U'
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
    }
    setActiveTab('chats');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailableMembers = () => {
    const existingPrivateUserIds = conversations
      .filter(c => c.type === 'private')
      .map(c => c.user_id);
    
    return teamMembers.filter(member => {
      if (member.id === user?.id) return false;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        member.full_name?.toLowerCase().includes(searchLower) ||
        member.username?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower)
      );
      return matchesSearch;
    });
  };

  const availableMembers = getAvailableMembers();

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <MessageCircle size={20} />
        {conversations.filter(c => c.unread_count > 0).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
            {conversations.filter(c => c.unread_count > 0).length}
          </span>
        )}
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
        onClick={() => setIsMinimized(false)}
      >
        <MessageCircle size={20} />
        {conversations.filter(c => c.unread_count > 0).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
            {conversations.filter(c => c.unread_count > 0).length}
          </span>
        )}
      </div>
    );
  }

  if (activeConversation) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[550px] bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        <ChatWindow
          conversation={activeConversation}
          onBack={handleBackToList}
          user={user}
          onCloseWindow={handleCloseChat}
          onConversationUpdate={handleConversationUpdate}
          onMarkAsRead={handleMarkConversationAsRead}
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[550px] bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-white" />
          <h3 className="text-white font-semibold text-sm">Messages</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={handleMinimize} className="text-white/80 hover:text-white transition">
            <Minimize2 size={14} />
          </button>
          <button onClick={handleCloseChat} className="text-white/80 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
            activeTab === 'chats'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <MessageSquare size={14} />
          Chats
          {conversations.filter(c => c.unread_count > 0).length > 0 && (
            <span className="ml-1 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {conversations.filter(c => c.unread_count > 0).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
            activeTab === 'team'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Users size={14} />
          Équipe
        </button>
      </div>

      <div className="p-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={activeTab === 'chats' ? "Rechercher une conversation..." : "Rechercher un membre..."}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : activeTab === 'chats' ? (
          filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune conversation</p>
              <p className="text-xs">Les discussions apparaîtront ici</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={false}
                onClick={handleConversationClick}
                lastMessage={lastMessages[conv.id]}
              />
            ))
          )
        ) : (
          availableMembers.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {searchTerm ? "Aucun membre trouvé" : "Aucun membre dans l'équipe"}
              </p>
              {searchTerm && (
                <p className="text-xs mt-1">Essayez un autre terme de recherche</p>
              )}
            </div>
          ) : (
            availableMembers.map(member => (
              <AdminMemberItem
                key={member.id}
                member={member}
                onClick={() => handleStartPrivateChat(member)}
                isCurrentUser={member.id === user?.id}
              />
            ))
          )
        )}
      </div>
    </div>
  );
};

export default AdminChatWidget;