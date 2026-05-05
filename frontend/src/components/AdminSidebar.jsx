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
    <div className="fixed inset-0 z-[9999] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full shadow-xl border-r border-purple-500/30 flex flex-col animate-slide-in">
        
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{getDisplayName()}</p>
              <p className="text-white/50 text-xs truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control &amp; Management</p>
          <div className="space-y-1">
            {allItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { onLogout(); onClose?.(); }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant AdminSidebarInline (sidebar fixe)
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
    <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30 flex flex-col z-40">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {getInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{getDisplayName()}</p>
            <p className="text-white/50 text-xs truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control &amp; Management</p>
        <div className="space-y-1">
          {allItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;