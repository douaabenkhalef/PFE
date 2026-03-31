import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/student/applications/`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-4">
        <button onClick={() => navigate('/student/dashboard')} className="text-white flex items-center gap-2">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Applications</h1>
        {loading ? (
          <p className="text-white">Loading...</p>
        ) : applications.length === 0 ? (
          <div className="bg-white/10 rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-white/40 mb-2" />
            <p className="text-white/60">You have not applied to any internships yet.</p>
            <button onClick={() => navigate('/student/dashboard')} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg">
              Browse Internships
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white/10 rounded-xl border border-white/20">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-4 py-2 text-left">Offer</th>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Applied At</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-b border-white/10">
                    <td className="px-4 py-2">{app.offer_title}</td>
                    <td className="px-4 py-2">{app.company_name}</td>
                    <td className="px-4 py-2">{new Date(app.applied_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        app.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button className="text-indigo-400 hover:text-indigo-300">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}