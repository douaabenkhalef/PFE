// frontend/src/components/StudentSidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, FileText, ClipboardList, LogOut, Search,
  ChevronRight, X
} from 'lucide-react';
import "./StudentSidebar.css";

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
    <>
      {/* Backdrop */}
      <div className="ssb-backdrop" onClick={onClose} />
      
      {/* Sidebar Panel */}
      <div className="ssb-panel">
        {/* Close button */}
        <button className="ssb-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* User info */}
        <div className="ssb-user">
          <div className="ssb-avatar-img-wrapper">
            {profilePicture && !imageError ? (
              <img 
                src={profilePicture} 
                alt={getDisplayName()} 
                className="ssb-avatar-img"
                onError={() => {
                  setImageError(true);
                  setProfilePicture(null);
                }}
              />
            ) : (
              <div className="ssb-avatar">
                <span>{getInitials()}</span>
              </div>
            )}
          </div>
          <div className="ssb-user-info">
            <p className="ssb-name">{getDisplayName()}</p>
            <p className="ssb-email">{getDisplayEmail()}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="ssb-search">
          <Search size={14} className="ssb-search-icon" />
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ssb-search-input"
          />
        </div>

        {/* Navigation */}
        <nav className="ssb-nav">
          {menuItems.map(({ group, items }) => {
            const visibleItems = filterItems(items);
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={group} className="ssb-group">
                <p className="ssb-group-label">{group}</p>
                <div className="ssb-group-items">
                  {visibleItems.map(({ icon: Icon, label, path }) => (
                    <button
                      key={path}
                      onClick={() => handleNavigation(path)}
                      className={`ssb-item ${location.pathname === path ? 'active' : ''}`}
                    >
                      <Icon size={16} className="ssb-item-icon" />
                      <span>{label}</span>
                      <ChevronRight size={14} className="ssb-item-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="ssb-footer">
          <button onClick={() => { onLogout(); onClose(); }} className="ssb-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}