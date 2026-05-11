// frontend/src/page/SuperAdminDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, GraduationCap, Briefcase, FileText, Bell,
  TrendingUp, Activity, Search, Filter, Eye, Trash2, Edit2,
  CheckCircle, XCircle, Clock, ArrowLeft, LogOut, Moon, Sun,
  Download, RefreshCw, Settings, Shield, Award, BarChart3,
  Mail, Phone, MapPin, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

// ==================== Stat Card Component ====================
const StatCard = ({ title, value, icon: Icon, color, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`stat-card ${visible ? 'visible' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 16,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)'
      }}
    >
      <div className="stat-icon" style={{ background: `${color}20`, borderRadius: '12px', padding: '12px' }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <p className="stat-label" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '4px' }}>
          {title}
        </p>
        <p className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
          {value}
        </p>
      </div>
    </div>
  );
};

// ==================== User Management Modal ====================
const UserDetailModal = ({ user: targetUser, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(targetUser?.status || false);
  const [subRole, setSubRole] = useState(targetUser?.sub_role || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/users/${targetUser.id}/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status, sub_role: subRole })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully');
        onRefresh();
        onClose();
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/users/${targetUser.id}/`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User deleted successfully');
        onRefresh();
        onClose();
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (!targetUser) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{targetUser.username}</h2>
            <p className="text-slate-400 text-sm">{targetUser.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Role</p>
              <p className="text-white font-medium">{targetUser.role}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Sub Role</p>
              <p className="text-white font-medium">{targetUser.sub_role || '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Created At</p>
              <p className="text-white">{targetUser.created_at || '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${targetUser.status ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white">{targetUser.status ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          {targetUser.student_profile && (
            <div className="bg-slate-800/60 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Student Profile</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-400">Full Name:</span> {targetUser.student_profile.full_name}</p>
                <p><span className="text-slate-400">University:</span> {targetUser.student_profile.university}</p>
                <p><span className="text-slate-400">Major:</span> {targetUser.student_profile.major}</p>
                <p><span className="text-slate-400">Education Level:</span> {targetUser.student_profile.education_level}</p>
                <p><span className="text-slate-400">Skills:</span> {targetUser.student_profile.skills?.join(', ') || '—'}</p>
                <p><span className="text-slate-400">Placed:</span> {targetUser.student_profile.is_placed ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          )}

          {targetUser.company_profile && (
            <div className="bg-slate-800/60 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-3">Company Profile</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-400">Company Name:</span> {targetUser.company_profile.company_name}</p>
                <p><span className="text-slate-400">Industry:</span> {targetUser.company_profile.industry}</p>
                <p><span className="text-slate-400">Location:</span> {targetUser.company_profile.location}</p>
                <p><span className="text-slate-400">Verified:</span> {targetUser.company_profile.verified ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-white mb-4">Actions</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div>
                  <p className="text-white text-sm font-medium">Account Status</p>
                  <p className="text-white/40 text-xs">Activate or deactivate this user</p>
                </div>
                <button
                  onClick={() => setStatus(!status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${status ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600/20 hover:bg-red-600/30 text-red-300'}`}
                >
                  {status ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div>
                  <p className="text-white text-sm font-medium">Sub Role</p>
                  <p className="text-white/40 text-xs">Change user's sub-role</p>
                </div>
                <select
                  value={subRole}
                  onChange={(e) => setSubRole(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">None</option>
                  <option value="company_manager">Company Manager</option>
                  <option value="hiring_manager">Hiring Manager</option>
                  <option value="admin">Department Head</option>
                  <option value="co_dept_head">Co Department Head</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-red-500/10 rounded-lg p-3">
                <div>
                  <p className="text-red-300 text-sm font-medium">Delete Account</p>
                  <p className="text-red-400/60 text-xs">Permanently delete this user</p>
                </div>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-semibold transition"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={onClose} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load theme from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'false') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setIsDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('darkMode', 'false');
      setIsDarkMode(false);
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('darkMode', 'true');
      setIsDarkMode(true);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/super-admin/stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/super-admin/users/?page=1&page_size=100`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API}/super-admin/companies/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setCompanies(data.companies);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API}/super-admin/offers/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setOffers(data.offers);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API}/super-admin/applications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchCompanies(),
      fetchOffers(),
      fetchApplications()
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    student: 'bg-blue-500/20 text-blue-300',
    company: 'bg-purple-500/20 text-purple-300',
    admin: 'bg-green-500/20 text-green-300'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sd-navbar" style={{ borderBottom: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: 70 }}>
        <div className="sd-navbar-left">
          <div className="sd-logo-container" style={{ cursor: 'default' }}>
            <img src="/images/logo.png" alt="UnivStage Logo" className="sd-logo-img" />
            <span className="sd-site-name">UnivStage - Super Admin</span>
          </div>
        </div>
        <div className="sd-navbar-right">
          <button className="sd-icon-btn" onClick={toggleTheme}>
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="pt-20 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/20 pb-2 flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <BarChart3 size={16} className="inline mr-2" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <Users size={16} className="inline mr-2" /> Users
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'companies' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <Building2 size={16} className="inline mr-2" /> Companies
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'offers' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <Briefcase size={16} className="inline mr-2" /> Offers
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'applications' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <FileText size={16} className="inline mr-2" /> Applications
            </button>
          </div>

          {activeTab === 'dashboard' && stats && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard title="Total Users" value={stats.total_users} icon={Users} color="#8b5cf6" />
                <StatCard title="Total Companies" value={stats.total_companies} icon={Building2} color="#f472b6" />
                <StatCard title="Total Offers" value={stats.total_offers} icon={Briefcase} color="#34d399" />
                <StatCard title="Total Applications" value={stats.total_applications} icon={FileText} color="#fbbf24" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users by Role */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Users size={18} className="text-purple-400" /> Users by Role
                  </h3>
                  <div className="space-y-3">
                    {stats.users_by_role && Object.entries(stats.users_by_role).map(([role, count]) => (
                      <div key={role} className="flex justify-between items-center">
                        <span className="text-white/70 capitalize">{role}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / stats.total_users) * 100}%` }} />
                          </div>
                          <span className="text-white font-semibold">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Applications by Status */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-purple-400" /> Applications Status
                  </h3>
                  <div className="space-y-3">
                    {stats.applications_by_status && Object.entries(stats.applications_by_status).map(([status, count]) => {
                      const statusLabels = {
                        'pending': 'Pending',
                        'accepted_by_company': 'Accepted by Company',
                        'rejected_by_company': 'Rejected by Company',
                        'validated_by_co_dept': 'Validated',
                        'rejected_by_co_dept': 'Rejected by University'
                      };
                      return (
                        <div key={status} className="flex justify-between items-center">
                          <span className="text-white/70 text-sm">{statusLabels[status] || status}</span>
                          <span className="text-white font-semibold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Users */}
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="p-5 border-b border-white/10">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Users size={18} className="text-purple-400" /> Recent Users
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/10 text-white/50 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Username</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.recent_users?.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition">
                          <td className="px-4 py-3 text-white">{user.username}</td>
                          <td className="px-4 py-3 text-white/70">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-500/20 text-gray-300'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50">{user.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                <button onClick={fetchUsers} className="flex items-center gap-2 bg-purple-600/40 hover:bg-purple-600/60 text-white px-4 py-2 rounded-lg text-sm transition">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/10 text-white/50 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Username</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Created At</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition">
                          <td className="px-4 py-3 text-white">{user.username}</td>
                          <td className="px-4 py-3 text-white/70">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-500/20 text-gray-300'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.status ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                              {user.status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50">{user.created_at || '—'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-medium transition"
                            >
                              <Eye size={14} /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Company Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Industry</th>
                      <th className="px-4 py-3 text-left">Location</th>
                      <th className="px-4 py-3 text-left">Offers</th>
                      <th className="px-4 py-3 text-left">Applications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {companies.map(company => (
                      <tr key={company.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-white">{company.company_name}</td>
                        <td className="px-4 py-3 text-white/70">{company.email || '—'}</td>
                        <td className="px-4 py-3 text-white/70">{company.industry || '—'}</td>
                        <td className="px-4 py-3 text-white/70">{company.location || '—'}</td>
                        <td className="px-4 py-3 text-white">{company.offers_count}</td>
                        <td className="px-4 py-3 text-white">{company.applications_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Company</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Wilaya</th>
                      <th className="px-4 py-3 text-left">Applications</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {offers.map(offer => (
                      <tr key={offer.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-white">{offer.title}</td>
                        <td className="px-4 py-3 text-white/70">{offer.company_name}</td>
                        <td className="px-4 py-3 text-white/70">{offer.internship_type}</td>
                        <td className="px-4 py-3 text-white/70">{offer.wilaya}</td>
                        <td className="px-4 py-3 text-white">{offer.applications_count}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${offer.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Offer</th>
                      <th className="px-4 py-3 text-left">Company</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Applied At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-white">{app.student_name}</td>
                        <td className="px-4 py-3 text-white/70">{app.offer_title}</td>
                        <td className="px-4 py-3 text-white/70">{app.company_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/50">{app.applied_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onRefresh={fetchUsers} />
      )}
    </div>
  );
}