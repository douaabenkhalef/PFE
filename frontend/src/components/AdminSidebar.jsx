// frontend/src/components/AdminSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User, Building2, FileText, Users, Activity, LogOut, Search,
  GraduationCap, LayoutDashboard, UsersRound
} from 'lucide-react';

const API = 'https://pfe-l31r.onrender.com/api';

const AdminSidebar = ({ user, onLogout, onClose }) => {
  const location = useLocation();
  const isDeptHead = user?.sub_role === 'admin';
  const isCoDeptHead = user?.sub_role === 'co_dept_head';

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const baseItems = [
    { path: isDeptHead ? '/admin/dashboard' : '/co-dept-head/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const deptHeadItems = [
    { path: '/admin/my-profile',            label: 'My Profile',              icon: User },
    { path: '/admin/university-profile',    label: 'University Profile',      icon: Building2 },
    { path: '/admin/manage-students',       label: 'Manage Students',         icon: GraduationCap },
    { path: '/admin/manage-co-dept-heads',  label: 'Manage Co Dept Heads',    icon: Users },
    { path: '/admin/activity-logs',         label: 'Dept Head Activity Logs', icon: Activity },
    { path: '/admin/validations',           label: 'Convention Requests',     icon: FileText },
    { path: '/university/team',             label: 'My Team',                  icon: UsersRound },
  ];

  const coDeptHeadItems = [
    { path: '/co-dept-head/my-profile',         label: 'My Profile',           icon: User },
    { path: '/admin/university-profile',        label: 'University Profile',   icon: Building2 },
    { path: '/admin/manage-students',           label: 'Manage Students',      icon: GraduationCap },
    { path: '/co-dept-head/validations',        label: 'Convention Requests',  icon: FileText },
    { path: '/university/team',                 label: 'My Team',              icon: UsersRound },
  ];

  const items = isDeptHead ? deptHeadItems : coDeptHeadItems;
  const allItems = [...baseItems, ...items];

  return (
    <>
      {/* Backdrop */}
      <div className="admin-sidebar-backdrop" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="admin-sidebar">
        
        {/* Close button */}
        <button onClick={onClose} className="admin-sidebar-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {getInitials()}
            </div>
            <div className="admin-sidebar-user-info">
              <p className="admin-sidebar-name">{getDisplayName()}</p>
              <p className="admin-sidebar-email">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="admin-sidebar-search">
          <div className="admin-sidebar-search-wrapper">
            <Search size={16} className="admin-sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search"
              className="admin-sidebar-search-input"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav">
          <p className="admin-sidebar-nav-label">Control &amp; Management</p>
          <div className="admin-sidebar-nav-items">
            {allItems.map((item) => {
              const isActive = location.pathname === item.path;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`admin-sidebar-nav-link ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="admin-sidebar-footer">
          <button onClick={() => { onLogout(); onClose?.(); }} className="admin-sidebar-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        /* ===== ADMIN SIDEBAR STYLES ===== */
        
        /* Backdrop */
        .admin-sidebar-backdrop {
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
        .admin-sidebar {
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
          animation: slideInLeft 0.3s ease-out;
        }
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        /* Close button */
        .admin-sidebar-close {
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
        .admin-sidebar-close:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        
        /* Header */
        .admin-sidebar-header {
          padding: 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 8px;
        }
        .admin-sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-sidebar-avatar {
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
          flex-shrink: 0;
        }
        .admin-sidebar-user-info {
          flex: 1;
          min-width: 0;
        }
        .admin-sidebar-name {
          color: white;
          font-weight: 500;
          font-size: 0.85rem;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-sidebar-email {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Search */
        .admin-sidebar-search {
          padding: 16px;
        }
        .admin-sidebar-search-wrapper {
          position: relative;
        }
        .admin-sidebar-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }
        .admin-sidebar-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 0.8rem;
          color: white;
          outline: none;
        }
        .admin-sidebar-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .admin-sidebar-search-input:focus {
          border-color: rgba(141, 35, 212, 0.6);
        }
        
        /* Navigation */
        .admin-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .admin-sidebar-nav-label {
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 12px 4px;
          margin: 0;
        }
        .admin-sidebar-nav-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .admin-sidebar-nav-link {
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
        .admin-sidebar-nav-link:hover {
          background: rgba(141, 35, 212, 0.2);
          color: white;
        }
        .admin-sidebar-nav-link.active {
          background: rgba(141, 35, 212, 0.3);
          color: #c084fc;
          font-weight: 500;
        }
        
        /* Footer */
        .admin-sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .admin-sidebar-logout {
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
        .admin-sidebar-logout:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        /* Scrollbar */
        .admin-sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .admin-sidebar-nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .admin-sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(141, 35, 212, 0.4);
          border-radius: 4px;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 260px;
          }
          .admin-sidebar-name {
            font-size: 0.8rem;
          }
          .admin-sidebar-email {
            font-size: 0.65rem;
          }
          .admin-sidebar-nav-link {
            padding: 8px 10px;
            font-size: 0.8rem;
          }
          .admin-sidebar-avatar {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }
        }
        
        @media (max-width: 580px) {
          .admin-sidebar {
            width: 250px;
          }
          .admin-sidebar-header {
            padding: 16px 12px;
          }
          .admin-sidebar-search {
            padding: 12px;
          }
          .admin-sidebar-nav {
            padding: 6px 10px;
          }
          .admin-sidebar-nav-link {
            padding: 7px 10px;
            font-size: 0.75rem;
          }
          .admin-sidebar-nav-link svg {
            width: 14px;
            height: 14px;
          }
          .admin-sidebar-footer {
            padding: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .admin-sidebar {
            width: 240px;
          }
          .admin-sidebar-name {
            font-size: 0.75rem;
          }
          .admin-sidebar-email {
            font-size: 0.6rem;
          }
          .admin-sidebar-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }
          .admin-sidebar-nav-label {
            font-size: 0.55rem;
            padding: 6px 10px 3px;
          }
          .admin-sidebar-nav-link {
            padding: 6px 8px;
            font-size: 0.7rem;
            gap: 10px;
          }
          .admin-sidebar-nav-link svg {
            width: 13px;
            height: 13px;
          }
          .admin-sidebar-logout {
            padding: 8px 10px;
            font-size: 0.75rem;
          }
          .admin-sidebar-logout svg {
            width: 14px;
            height: 14px;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .admin-sidebar {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%);
          border-right: 1px solid rgba(141, 35, 212, 0.2);
        }
        body.light-mode .admin-sidebar-name {
          color: #1a1a2e;
        }
        body.light-mode .admin-sidebar-email {
          color: #666;
        }
        body.light-mode .admin-sidebar-search-input {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(141, 35, 212, 0.2);
          color: #1a1a2e;
        }
        body.light-mode .admin-sidebar-search-input::placeholder {
          color: #999;
        }
        body.light-mode .admin-sidebar-nav-link {
          color: #555;
        }
        body.light-mode .admin-sidebar-nav-link:hover {
          background: rgba(141, 35, 212, 0.1);
          color: #8D23D4;
        }
        body.light-mode .admin-sidebar-nav-link.active {
          background: rgba(141, 35, 212, 0.15);
          color: #8D23D4;
        }
        body.light-mode .admin-sidebar-nav-label {
          color: #8D23D4;
          opacity: 0.7;
        }
        body.light-mode .admin-sidebar-close {
          background: rgba(0, 0, 0, 0.05);
          color: #666;
        }
        body.light-mode .admin-sidebar-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
        body.light-mode .admin-sidebar-logout {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }
        body.light-mode .admin-sidebar-logout:hover {
          background: rgba(220, 38, 38, 0.2);
        }
        body.light-mode .admin-sidebar-backdrop {
          background: rgba(0, 0, 0, 0.5);
        }
        body.light-mode .admin-sidebar-avatar {
          background: linear-gradient(135deg, #8D23D4, #6B21A5);
        }
        body.light-mode .admin-sidebar-nav::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        body.light-mode .admin-sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(141, 35, 212, 0.3);
        }
      `}</style>
    </>
  );
};

// AdminSidebarInline component (fixed sidebar, always visible)
export const AdminSidebarInline = ({ user, onLogout }) => {
  const location = useLocation();
  const isDeptHead = user?.sub_role === 'admin';
  const isCoDeptHead = user?.sub_role === 'co_dept_head';

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const baseItems = [
    { path: isDeptHead ? '/admin/dashboard' : '/co-dept-head/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const deptHeadItems = [
    { path: '/admin/my-profile',            label: 'My Profile',              icon: User },
    { path: '/admin/university-profile',    label: 'University Profile',      icon: Building2 },
    { path: '/admin/manage-students',       label: 'Manage Students',         icon: GraduationCap },
    { path: '/admin/manage-co-dept-heads',  label: 'Manage Co Dept Heads',    icon: Users },
    { path: '/admin/activity-logs',         label: 'Dept Head Activity Logs', icon: Activity },
    { path: '/admin/validations',           label: 'Convention Requests',     icon: FileText },
    { path: '/university/team',             label: 'My Team',                  icon: UsersRound },
  ];

  const coDeptHeadItems = [
    { path: '/co-dept-head/my-profile',         label: 'My Profile',           icon: User },
    { path: '/admin/university-profile',        label: 'University Profile',   icon: Building2 },
    { path: '/admin/manage-students',           label: 'Manage Students',      icon: GraduationCap },
    { path: '/co-dept-head/validations',        label: 'Convention Requests',  icon: FileText },
    { path: '/university/team',                 label: 'My Team',              icon: UsersRound },
  ];

  const items = isDeptHead ? deptHeadItems : coDeptHeadItems;
  const allItems = [...baseItems, ...items];

  return (
    <div className="admin-sidebar-inline">
      <div className="admin-sidebar-inline-header">
        <div className="admin-sidebar-inline-user">
          <div className="admin-sidebar-inline-avatar">
            {getInitials()}
          </div>
          <div className="admin-sidebar-inline-user-info">
            <p className="admin-sidebar-inline-name">{getDisplayName()}</p>
            <p className="admin-sidebar-inline-email">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="admin-sidebar-inline-search">
        <div className="admin-sidebar-inline-search-wrapper">
          <Search size={16} className="admin-sidebar-inline-search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="admin-sidebar-inline-search-input"
          />
        </div>
      </div>

      <nav className="admin-sidebar-inline-nav">
        <p className="admin-sidebar-inline-nav-label">Control &amp; Management</p>
        <div className="admin-sidebar-inline-nav-items">
          {allItems.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-sidebar-inline-nav-link ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="admin-sidebar-inline-footer">
        <button onClick={onLogout} className="admin-sidebar-inline-logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        /* ===== ADMIN SIDEBAR INLINE STYLES ===== */
        .admin-sidebar-inline {
          width: 260px;
          background: linear-gradient(180deg, #1a0840 0%, #0e0c27 100%);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          overflow-y: auto;
          border-right: 1px solid rgba(141, 35, 212, 0.3);
          display: flex;
          flex-direction: column;
          z-index: 40;
        }
        
        .admin-sidebar-inline-header {
          padding: 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .admin-sidebar-inline-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-sidebar-inline-avatar {
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
          flex-shrink: 0;
        }
        .admin-sidebar-inline-user-info {
          flex: 1;
          min-width: 0;
        }
        .admin-sidebar-inline-name {
          color: white;
          font-weight: 500;
          font-size: 0.85rem;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-sidebar-inline-email {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .admin-sidebar-inline-search {
          padding: 16px;
        }
        .admin-sidebar-inline-search-wrapper {
          position: relative;
        }
        .admin-sidebar-inline-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }
        .admin-sidebar-inline-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 0.8rem;
          color: white;
          outline: none;
        }
        .admin-sidebar-inline-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .admin-sidebar-inline-search-input:focus {
          border-color: rgba(141, 35, 212, 0.6);
        }
        
        .admin-sidebar-inline-nav {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .admin-sidebar-inline-nav-label {
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 12px 4px;
          margin: 0;
        }
        .admin-sidebar-inline-nav-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .admin-sidebar-inline-nav-link {
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
        .admin-sidebar-inline-nav-link:hover {
          background: rgba(141, 35, 212, 0.2);
          color: white;
        }
        .admin-sidebar-inline-nav-link.active {
          background: rgba(141, 35, 212, 0.3);
          color: #c084fc;
          font-weight: 500;
        }
        
        .admin-sidebar-inline-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .admin-sidebar-inline-logout {
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
        .admin-sidebar-inline-logout:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        /* Scrollbar */
        .admin-sidebar-inline-nav::-webkit-scrollbar {
          width: 4px;
        }
        .admin-sidebar-inline-nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .admin-sidebar-inline-nav::-webkit-scrollbar-thumb {
          background: rgba(141, 35, 212, 0.4);
          border-radius: 4px;
        }
        
        /* ===== RESPONSIVE STYLES FOR INLINE ===== */
        @media (max-width: 768px) {
          .admin-sidebar-inline {
            width: 240px;
          }
          .admin-sidebar-inline-name {
            font-size: 0.8rem;
          }
          .admin-sidebar-inline-email {
            font-size: 0.65rem;
          }
          .admin-sidebar-inline-nav-link {
            padding: 8px 10px;
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 580px) {
          .admin-sidebar-inline {
            width: 220px;
          }
          .admin-sidebar-inline-header {
            padding: 14px 12px;
          }
          .admin-sidebar-inline-avatar {
            width: 38px;
            height: 38px;
            font-size: 0.9rem;
          }
          .admin-sidebar-inline-nav-link {
            padding: 7px 10px;
            font-size: 0.75rem;
          }
          .admin-sidebar-inline-nav-link svg {
            width: 14px;
            height: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .admin-sidebar-inline {
            width: 200px;
          }
          .admin-sidebar-inline-name {
            font-size: 0.7rem;
          }
          .admin-sidebar-inline-email {
            font-size: 0.55rem;
          }
          .admin-sidebar-inline-avatar {
            width: 34px;
            height: 34px;
            font-size: 0.8rem;
          }
          .admin-sidebar-inline-nav-label {
            font-size: 0.5rem;
            padding: 6px 10px 3px;
          }
          .admin-sidebar-inline-nav-link {
            padding: 6px 8px;
            font-size: 0.65rem;
            gap: 8px;
          }
          .admin-sidebar-inline-nav-link svg {
            width: 12px;
            height: 12px;
          }
          .admin-sidebar-inline-logout {
            padding: 8px 10px;
            font-size: 0.7rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES FOR INLINE ===== */
        body.light-mode .admin-sidebar-inline {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%);
          border-right: 1px solid rgba(141, 35, 212, 0.2);
        }
        body.light-mode .admin-sidebar-inline-name {
          color: #1a1a2e;
        }
        body.light-mode .admin-sidebar-inline-email {
          color: #666;
        }
        body.light-mode .admin-sidebar-inline-search-input {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(141, 35, 212, 0.2);
          color: #1a1a2e;
        }
        body.light-mode .admin-sidebar-inline-search-input::placeholder {
          color: #999;
        }
        body.light-mode .admin-sidebar-inline-nav-link {
          color: #555;
        }
        body.light-mode .admin-sidebar-inline-nav-link:hover {
          background: rgba(141, 35, 212, 0.1);
          color: #8D23D4;
        }
        body.light-mode .admin-sidebar-inline-nav-link.active {
          background: rgba(141, 35, 212, 0.15);
          color: #8D23D4;
        }
        body.light-mode .admin-sidebar-inline-nav-label {
          color: #8D23D4;
          opacity: 0.7;
        }
        body.light-mode .admin-sidebar-inline-logout {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }
        body.light-mode .admin-sidebar-inline-logout:hover {
          background: rgba(220, 38, 38, 0.2);
        }
        body.light-mode .admin-sidebar-inline-avatar {
          background: linear-gradient(135deg, #8D23D4, #6B21A5);
        }
      `}</style>
    </div>
  );
};

export default AdminSidebar;