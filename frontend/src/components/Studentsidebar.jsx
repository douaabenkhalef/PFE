// frontend/src/components/Studentsidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, User, FileText, ClipboardList, LogOut, Search,
  ChevronRight
} from 'lucide-react';
import './StudentSidebar.css';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Authorization': `Bearer ${token()}`
});

export default function StudentSidebar({ user, onLogout, onClose }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(true);

  // جلب صورة البروفيل من الخادم
  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(`${API}/student/profile/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.profile.profile_picture) {
        let imgUrl = data.profile.profile_picture;
        if (imgUrl && !imgUrl.startsWith('http')) {
          imgUrl = `http://localhost:8000${imgUrl}`;
        }
        setProfilePicture(imgUrl);
      }
    } catch (err) {
      console.error('Error fetching profile picture:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilePicture();
  }, []);

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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

  const filtered = (items) =>
    items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div className="ssb-backdrop" onClick={onClose} />
      <aside className="ssb-panel">
        <button className="ssb-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="ssb-user">
          {/* 🔥 إظهار الصورة إذا وجدت، وإلا إظهار الحرف الأول */}
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt="Profile" 
              className="ssb-avatar-img"
              onError={(e) => {
                e.target.style.display = 'none';
                setProfilePicture(null);
              }}
            />
          ) : (
            <div className="ssb-avatar">{initials}</div>
          )}
          <div>
            <p className="ssb-name">{user?.full_name || user?.username || 'Student'}</p>
            <p className="ssb-email">{user?.email}</p>
          </div>
        </div>

        <div className="ssb-search">
          <Search size={14} className="ssb-search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ssb-search-input"
          />
        </div>

        <nav className="ssb-nav">
          {menuItems.map(({ group, items }) => {
            const visible = filtered(items);
            if (visible.length === 0) return null;
            return (
              <div key={group} className="ssb-group">
                <p className="ssb-group-label">{group}</p>
                {visible.map(({ icon: Icon, label, path }) => (
                  <button
                    key={path}
                    className={`ssb-item${window.location.pathname === path ? ' active' : ''}`}
                    onClick={() => handleNav(path)}
                  >
                    <Icon size={16} className="ssb-item-icon" />
                    <span>{label}</span>
                    <ChevronRight size={14} className="ssb-item-arrow" />
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="ssb-footer">
          <button className="ssb-logout" onClick={onLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}