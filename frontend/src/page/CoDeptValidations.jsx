import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, Eye, FileText, 
  Building2, GraduationCap, MapPin, Calendar, Code,
  Mail, User, BookOpen, Award, Github, Globe,
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const StatusBadge = ({ status }) => {
  const statusMap = {
    'pending': { label: 'En attente entreprise', color: 'bg-yellow-500/20 text-yellow-300' },
    'accepted_by_company': { label: 'Accepté par entreprise', color: 'bg-blue-500/20 text-blue-300' },
    'validated_by_co_dept': { label: 'Validé', color: 'bg-green-500/20 text-green-300' },
    'rejected_by_co_dept': { label: 'Refusé', color: 'bg-red-500/20 text-red-300' },
    'rejected_by_company': { label: 'Refusé par entreprise', color: 'bg-red-500/20 text-red-300' }
  };
  const s = statusMap[status] || { label: status, color: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
};


const DetailsModal = ({ application, onClose, onValidate, onReject }) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cvUrl, setCvUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);

  if (!application) return null;

  const loadCV = async () => {
    if (!application.cv_file_url) return;
    setLoadingCv(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000${application.cv_file_url}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCvUrl(url);
    } catch (err) {
      toast.error('Erreur lors du chargement du CV');
    } finally {
      setLoadingCv(false);
    }
  };

  const handleValidate = async () => {
    setSubmitting(true);
    await onValidate(application.id);
    setSubmitting(false);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez entrer une raison de refus');
      return;
    }
    setSubmitting(true);
    await onReject(application.id, rejectReason);
    setSubmitting(false);
    setShowRejectForm(false);
    setRejectReason('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">{application.offer.title}</h2>
              <p className="text-slate-400 text-sm mt-1">
                Candidature de <span className="text-white font-medium">{application.student.full_name}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <StatusBadge status={application.status} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Infos offre */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={15} /> Offre de stage
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Entreprise</p>
                <p className="text-sm text-white font-medium">{application.company.company_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Wilaya</p>
                <p className="text-sm text-white">{application.offer.wilaya}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Type</p>
                <p className="text-sm text-white">{application.offer.internship_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Durée</p>
                <p className="text-sm text-white">{application.offer.duration}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Description</p>
              <p className="text-sm text-slate-300">{application.offer.description}</p>
            </div>
            {application.offer.required_skills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={12} /> Compétences requises</p>
                <div className="flex flex-wrap gap-2">
                  {application.offer.required_skills.map(skill => (
                    <span key={skill} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Infos étudiant */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap size={15} /> Profil étudiant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-500" />
                <span className="text-white">{application.student.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-500" />
                <span className="text-white">{application.student.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-white">{application.student.wilaya}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-slate-500" />
                <span className="text-white">{application.student.university}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={14} className="text-slate-500" />
                <span className="text-white">{application.student.major} - {application.student.education_level}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-white">Promotion {application.student.graduation_year}</span>
              </div>
            </div>
            {application.student.skills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={12} /> Compétences</p>
                <div className="flex flex-wrap gap-2">
                  {application.student.skills.map(skill => (
                    <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            {(application.student.github || application.student.portfolio) && (
              <div className="mt-4 flex gap-4">
                {application.student.github && (
                  <a href={application.student.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                    <Github size={14} /> GitHub
                  </a>
                )}
                {application.student.portfolio && (
                  <a href={application.student.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                    <Globe size={14} /> Portfolio
                  </a>
                )}
              </div>
            )}
          </div>

          {}
          {application.cv_file_url && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={15} /> CV de l'étudiant
              </h3>
              {!cvUrl && !loadingCv && (
                <button onClick={loadCV} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
                  Charger le CV
                </button>
              )}
              {loadingCv && <p className="text-slate-400">Chargement...</p>}
              {cvUrl && (
                <iframe src={cvUrl} title="CV" className="w-full h-96 rounded-lg border border-slate-600" />
              )}
            </div>
          )}

          {}
          {application.cover_letter && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Lettre de motivation</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{application.cover_letter}</p>
            </div>
          )}

          {}
          {application.status === 'accepted_by_company' && (
            <div className="border-t border-slate-700 pt-6">
              {showRejectForm ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                  <p className="text-red-300 text-sm font-medium mb-3">Motif du refus <span className="text-red-400">*</span></p>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none min-h-[100px] focus:outline-none focus:border-red-500"
                    placeholder="Expliquez pourquoi cette demande est refusée..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleRejectSubmit}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Confirmer le refus
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                      className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={handleValidate}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Valider et générer la convention
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-6 py-3 rounded-lg font-semibold"
                  >
                    <XCircle size={18} />
                    Refuser
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant principal
export default function CoDeptValidations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [stats, setStats] = useState({ pending: 0, total: 0 });

  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/co-dept/pending-validations/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications);
        setStats({
          pending: data.applications.filter(a => a.status === 'accepted_by_company').length,
          total: data.applications.length
        });
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingValidations();
  }, []);

  const handleValidate = async (applicationId) => {
    try {
      const res = await fetch(`${API}/co-dept/validate-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Convention validée et générée avec succès !');
        fetchPendingValidations();
        setSelectedApp(null);
      } else {
        toast.error(data.error || 'Erreur lors de la validation');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    }
  };

  const handleReject = async (applicationId, reason) => {
    try {
      const res = await fetch(`${API}/co-dept/reject-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rejection_reason: reason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Candidature refusée');
        fetchPendingValidations();
        setSelectedApp(null);
      } else {
        toast.error(data.error || 'Erreur lors du refus');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    }
  };

  const pendingCount = applications.filter(a => a.status === 'accepted_by_company').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/co-dept-head/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={18} />
                Retour
              </button>
              <span className="text-white/30">|</span>
              <h1 className="text-xl font-bold text-white">Validations des conventions</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.username}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "Université"}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">En attente de validation</p>
                <p className="text-3xl font-bold text-white">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total traitées</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Taux de validation</p>
                <p className="text-3xl font-bold text-white">
                  {stats.total > 0 ? Math.round((stats.total - pendingCount) / stats.total * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-purple-400" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune convention en attente</h3>
            <p className="text-white/60">Toutes les conventions ont été traitées.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all"
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{app.offer.title}</h3>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Étudiant</p>
                        <p className="text-white font-medium">{app.student.full_name}</p>
                        <p className="text-white/40 text-xs">{app.student.email}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Entreprise</p>
                        <p className="text-white font-medium">{app.company.company_name}</p>
                        <p className="text-white/40 text-xs">{app.company.location}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Candidature</p>
                        <p className="text-white">Acceptée le {app.company_response_date}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition"
                  >
                    <Eye size={16} />
                    Voir détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {}
      {selectedApp && (
        <DetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidate}
          onReject={handleReject}
        />
      )}
    </div>
  );
}