import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

export default function CompanyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/applications/`, {
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

  const handleRespond = async (appId, status) => {
    try {
      const res = await fetch(`${API}/company/applications/${appId}/respond/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-4">
        <Link to={user?.sub_role === 'company_manager' ? '/company-manager/dashboard' : '/company/dashboard'} className="text-white flex items-center gap-2">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Applications Received</h1>
        {loading ? (
          <p className="text-white">Loading...</p>
        ) : applications.length === 0 ? (
          <p className="text-white/60">No applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white/10 rounded-xl border border-white/20">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-left">Offer</th>
                  <th className="px-4 py-2 text-left">Applied At</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-b border-white/10">
                    <td className="px-4 py-2">{app.student_name}</td>
                    <td className="px-4 py-2">{app.offer_title}</td>
                    <td className="px-4 py-2">{new Date(app.applied_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{app.status}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleRespond(app.id, 'accepted')} className="bg-green-600 text-white px-3 py-1 rounded mr-2">Accept</button>
                      <button onClick={() => handleRespond(app.id, 'rejected')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
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