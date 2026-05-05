// frontend/src/components/StudentSidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, FileText, ClipboardList, LogOut, Search,
  ChevronRight, GraduationCap
} from 'lucide-react';

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Authorization': `Bearer ${token()}`
});

export default function StudentSidebar({ user, onLogout, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState(null);

  // جلب معلومات المستخدم والصورة الشخصية
  const fetchProfileData = async () => {
    try {
      // جلب معلومات المستخدم
      const userRes = await fetch(`${API}/auth/me/`, {
        headers: { 'Authorization': `Bearer ${token()}` }
      });
      const userData = await userRes.json();
      if (userData.success) {
        setProfile(userData.user);
      }

      // جلب صورة البروفيل
      const profileRes = await fetch(`${API}/student/profile/me/`, { headers: authHeaders() });
      const profileData = await profileRes.json();
      if (profileData.success && profileData.profile.profile_picture) {
        let imgUrl = profileData.profile.profile_picture;
        if (imgUrl && !imgUrl.startsWith('http')) {
          imgUrl = `https://pfe-l31r.onrender.com${imgUrl}`;
        }
        setProfilePicture(imgUrl);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // عرض اسم المستخدم
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    if (user?.full_name) return user.full_name;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Student';
  };

  // الحرف الأول من اسم المستخدم
  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  // البريد الإلكتروني
  const getDisplayEmail = () => {
    return profile?.email || user?.email || '';
  };

  const menuItems = [
    {
      group: 'Control & Management',
      items: [
        { icon: User, label: 'My Profile', path: '/student/profile' },
        { icon: FileText, label: 'My CV', path: '/student/cv' },
        { icon: ClipboardList, label: 'Application status', path: '/student/applications' },
      ],
    },
  ];

  // فلترة العناصر حسب البحث
  const filterItems = (items) => {
    if (!search) return items;
    return items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Sidebar Panel */}
      <div className="relative w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full shadow-xl border-r border-purple-500/30 flex flex-col animate-slide-in">
        
        {/* Header with User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {profilePicture && !imageError ? (
                <img 
                  src={profilePicture} 
                  alt={getDisplayName()} 
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageError(true);
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <GraduationCap size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{getDisplayName()}</p>
              <p className="text-white/50 text-xs truncate">{getDisplayEmail()}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {menuItems.map(({ group, items }) => {
            const visibleItems = filterItems(items);
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={group}>
                <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">{group}</p>
                <div className="space-y-1">
                  {visibleItems.map(({ icon: Icon, label, path }) => (
                    <button
                      key={path}
                      onClick={() => handleNavigation(path)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all ${
                        location.pathname === path
                          ? 'bg-purple-600/30 text-purple-300'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} />
                        <span>{label}</span>
                      </div>
                      <ChevronRight size={14} className="text-white/30" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}