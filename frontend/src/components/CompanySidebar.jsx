// frontend/src/components/CompanySidebar.jsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Activity, FileText, UserCog, LogOut, Search, User, Building2, X } from 'lucide-react';

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');

const CompanySidebar = ({ user, onLogout, onClose }) => {
  const location = useLocation();
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState(null);

  const isCompanyManager = user?.sub_role === 'company_manager';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const userRes = await fetch(`${API}/auth/me/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userData.success) {
          setProfile(userData.user);
          if (userData.user?.profile_picture_url) {
            let avatarUrl = userData.user.profile_picture_url;
            if (avatarUrl && !avatarUrl.startsWith('http')) {
              avatarUrl = `https://pfe-l31r.onrender.com${avatarUrl}`;
            }
            setProfileImage(avatarUrl);
          } else {
            setProfileImage(null);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const getDisplayName = () => {
    if (profile?.username) return profile.username;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getInitials = () => {
    return getDisplayName().charAt(0).toUpperCase();
  };

  const getDisplayEmail = () => {
    return profile?.email || user?.email || '';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="company-sidebar-backdrop"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="company-sidebar">
        
        {/* Close button */}
        <button onClick={onClose} className="company-sidebar-close">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="company-sidebar-header">
          <div className="company-sidebar-user">
            <div className="company-sidebar-avatar">
              {profileImage && !imageError ? (
                <img 
                  src={profileImage} 
                  alt={getDisplayName()} 
                  onError={() => {
                    setImageError(true);
                    setProfileImage(null);
                  }}
                />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
            <div className="company-sidebar-user-info">
              <p className="company-sidebar-name">{getDisplayName()}</p>
              <p className="company-sidebar-email">{getDisplayEmail()}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="company-sidebar-search">
          <div className="company-sidebar-search-wrapper">
            <Search size={16} className="company-sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search"
              className="company-sidebar-search-input"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="company-sidebar-nav">
          <div>
            <p className="company-sidebar-nav-label">Control & Management</p>
            <div className="company-sidebar-nav-items">
              <Link 
                to={isCompanyManager ? "/company-manager/profile" : "/company/profile"} 
                onClick={onClose} 
                className={`company-sidebar-nav-link ${location.pathname === (isCompanyManager ? "/company-manager/profile" : "/company/profile") ? 'active' : ''}`}
              >
                <User size={16} /> My Profile
              </Link>
              <Link 
                to="/company/company-profile" 
                onClick={onClose} 
                className={`company-sidebar-nav-link ${location.pathname === "/company/company-profile" ? 'active' : ''}`}
              >
                <Building2 size={16} /> Company Profile
              </Link>
              <Link 
                to="/company/manage-offers" 
                onClick={onClose} 
                className={`company-sidebar-nav-link ${location.pathname === "/company/manage-offers" ? 'active' : ''}`}
              >
                <Briefcase size={16} /> Manage offers
              </Link>
              <Link 
                to="/company/applications" 
                onClick={onClose} 
                className={`company-sidebar-nav-link ${location.pathname === "/company/applicions" ? 'active' : ''}`}
              >
                <FileText size={16} /> Student Application
              </Link>
              {isCompanyManager && (
                <>
                  <Link 
                    to="/company-manager/manage-hiring-managers" 
                    onClick={onClose} 
                    className={`company-sidebar-nav-link ${location.pathname === "/company-manager/manage-hiring-managers" ? 'active' : ''}`}
                  >
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link 
                    to="/company-manager/activity-logs" 
                    onClick={onClose} 
                    className={`company-sidebar-nav-link ${location.pathname === "/company-manager/activity-logs" ? 'active' : ''}`}
                  >
                    <Activity size={16} /> Control Hiring Manager Activity
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="company-sidebar-footer">
          <button onClick={() => { onLogout(); onClose(); }} className="company-sidebar-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        /* Backdrop */
        .company-sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1040;
        }
        
        /* Sidebar */
        .company-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100vh;
          background: linear-gradient(180deg, #1a0840 0%, #0e0c27 100%);
          border-right: 1px solid rgba(141, 35, 212, 0.3);
          box-shadow: 4px 0 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          z-index: 1050;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        /* Close button */
        .company-sidebar-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.2s;
          z-index: 10;
        }
        .company-sidebar-close:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        
        /* Header */
        .company-sidebar-header {
          padding: 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 8px;
        }
        .company-sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .company-sidebar-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8D23D4, #F75AFA);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
          overflow: hidden;
          flex-shrink: 0;
        }
        .company-sidebar-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .company-sidebar-user-info {
          flex: 1;
          min-width: 0;
        }
        .company-sidebar-name {
          color: white;
          font-weight: 500;
          font-size: 0.85rem;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .company-sidebar-email {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Search */
        .company-sidebar-search {
          padding: 16px;
        }
        .company-sidebar-search-wrapper {
          position: relative;
        }
        .company-sidebar-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }
        .company-sidebar-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 0.8rem;
          color: white;
          outline: none;
        }
        .company-sidebar-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .company-sidebar-search-input:focus {
          border-color: rgba(141, 35, 212, 0.6);
        }
        
        /* Navigation */
        .company-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .company-sidebar-nav-label {
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 12px 4px;
          margin: 0;
        }
        .company-sidebar-nav-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .company-sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: all 0.2s;
        }
        .company-sidebar-nav-link:hover {
          background: rgba(141, 35, 212, 0.2);
          color: white;
        }
        .company-sidebar-nav-link.active {
          background: rgba(141, 35, 212, 0.3);
          color: #c084fc;
          font-weight: 500;
        }
        
        /* Footer */
        .company-sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .company-sidebar-logout {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: rgba(239, 68, 68, 0.15);
          border: none;
          border-radius: 10px;
          font-size: 0.85rem;
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s;
        }
        .company-sidebar-logout:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        /* Scrollbar */
        .company-sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .company-sidebar-nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .company-sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(141, 35, 212, 0.4);
          border-radius: 4px;
        }
        
        /* ===== LIGHT MODE ===== */
        body.light-mode .company-sidebar {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%);
          border-right: 1px solid rgba(141, 35, 212, 0.2);
        }
        body.light-mode .company-sidebar-name {
          color: #1a1a2e;
        }
        body.light-mode .company-sidebar-email {
          color: #666;
        }
        body.light-mode .company-sidebar-search-input {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(141, 35, 212, 0.2);
          color: #1a1a2e;
        }
        body.light-mode .company-sidebar-search-input::placeholder {
          color: #999;
        }
        body.light-mode .company-sidebar-nav-link {
          color: #555;
        }
        body.light-mode .company-sidebar-nav-link:hover {
          background: rgba(141, 35, 212, 0.1);
          color: #8D23D4;
        }
        body.light-mode .company-sidebar-nav-link.active {
          background: rgba(141, 35, 212, 0.15);
          color: #8D23D4;
        }
        body.light-mode .company-sidebar-nav-label {
          color: #8D23D4;
          opacity: 0.7;
        }
        body.light-mode .company-sidebar-close {
          background: rgba(0, 0, 0, 0.05);
          color: #666;
        }
        body.light-mode .company-sidebar-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
          .company-sidebar {
            width: 260px;
          }
          .company-sidebar-name {
            font-size: 0.8rem;
          }
          .company-sidebar-email {
            font-size: 0.65rem;
          }
          .company-sidebar-nav-link {
            padding: 8px 10px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </>
  );
};

export default CompanySidebar;