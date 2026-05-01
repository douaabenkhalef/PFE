// frontend/src/components/UserAvatar.jsx
import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000/api';

const UserAvatar = ({ sizeClass = "w-10 h-10" }) => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [initial, setInitial] = useState('U');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API}/auth/me/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const u = data.user;
          setInitial(u.username?.charAt(0).toUpperCase() || 'U');
          if (u.profile_picture_url) {
            let url = u.profile_picture_url;
            if (!url.startsWith('http')) url = `http://localhost:8000${url}`;
            setAvatarUrl(url);
          } else {
            setAvatarUrl(null);
          }
        }
      } catch (err) {
        console.error('UserAvatar fetch error:', err);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

export default UserAvatar;