// frontend/src/page/ManageStudents.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, Eye, X, ArrowLeft, 
  GraduationCap, MapPin, Code, BookOpen, Calendar,
  CheckCircle, XCircle, Briefcase, Mail, Github, Globe,
  TrendingUp, Award, BarChart3, Loader2, Clock,
  ChevronDown, ChevronUp, PieChart, TrendingDown, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const StudentCard = ({ student, onClick }) => {
  return (
    <div 
      className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-purple-500 transition-all cursor-pointer"
      onClick={() => onClick(student)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-semibold text-lg">{student.full_name}</h3>
          <p className="text-purple-400 text-sm">{student.major}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          student.is_placed 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-yellow-500/20 text-yellow-300'
        }`}>
          {student.is_placed ? 'Stage trouvé' : 'En recherche'}
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Mail size={14} className="text-slate-500" />
          <span>{student.email}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin size={14} className="text-slate-500" />
          <span>{student.wilaya}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar size={14} className="text-slate-500" />
          <span>Promotion {student.graduation_year}</span>
        </div>
      </div>
      
      {student.skills && student.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {student.skills.slice(0, 3).map(skill => (
            <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {skill}
            </span>
          ))}
          {student.skills.length > 3 && (
            <span className="text-slate-400 text-xs">+{student.skills.length - 3}</span>
          )}
        </div>
      )}
      
      <div className="mt-3 flex gap-3 text-xs text-slate-400">
        <span>📋 {student.applications_count} candidatures</span>
        {student.accepted_applications > 0 && (
          <span className="text-green-400">✅ {student.accepted_applications} acceptées</span>
        )}
      </div>
    </div>
  );
};

const StudentDetailsModal = ({ student, onClose }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      fetchStudentDetails();
    }
  }, [student]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-students/${student.id}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{student.full_name}</h2>
            <p className="text-purple-400">{student.major} - {student.education_level}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informations personnelles */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-white">{student.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Wilaya</p>
                <p className="text-white">{student.wilaya}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Université</p>
                <p className="text-white">{student.university}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date d'inscription</p>
                <p className="text-white">{student.created_at}</p>
              </div>
            </div>
            
            {student.skills && student.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Compétences</p>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map(skill => (
                    <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 flex gap-4">
              {student.github && (
                <a href={student.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                  <Github size={14} /> GitHub
                </a>
              )}
              {student.portfolio && (
                <a href={student.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                  <Globe size={14} /> Portfolio
                </a>
              )}
            </div>
          </div>
          
          {/* Situation professionnelle */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Situation professionnelle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Statut</p>
                <p className={`font-semibold ${student.is_placed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {student.is_placed ? 'Stage trouvé' : 'En recherche de stage'}
                </p>
              </div>
              {student.is_placed && (
                <>
                  <div>
                    <p className="text-xs text-slate-500">Entreprise</p>
                    <p className="text-white">{student.placed_company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date de placement</p>
                    <p className="text-white">{student.placement_date}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Candidatures */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Historique des candidatures</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-purple-400" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Aucune candidature</p>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{app.offer_title}</p>
                        <p className="text-slate-400 text-sm">{app.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        app.status === 'validated_by_co_dept' ? 'bg-green-500/20 text-green-300' :
                        app.status === 'accepted_by_company' ? 'bg-blue-500/20 text-blue-300' :
                        app.status === 'rejected_by_company' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {app.status === 'validated_by_co_dept' ? 'Validé' :
                         app.status === 'accepted_by_company' ? 'Accepté' :
                         app.status === 'rejected_by_company' ? 'Refusé' : 'En attente'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Postulé le {app.applied_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsPanel = ({ stats, loading }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }
  
  if (!stats) return null;
  
  const { global, by_major, by_graduation_year, by_wilaya, top_skills, timeline } = stats;
  
  return (
    <div className="space-y-6">
      {/* Cartes globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total étudiants</p>
              <p className="text-3xl font-bold text-white">{global.total_students}</p>
            </div>
            <Users className="w-10 h-10 text-blue-400 opacity-60" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Stages trouvés</p>
              <p className="text-3xl font-bold text-green-400">{global.placed_students}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-400 opacity-60" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">En recherche</p>
              <p className="text-3xl font-bold text-yellow-400">{global.unplaced_students}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-yellow-400 opacity-60" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Taux de placement</p>
              <p className="text-3xl font-bold text-purple-400">{global.placement_rate}%</p>
            </div>
            <PieChart className="w-10 h-10 text-purple-400 opacity-60" />
          </div>
        </div>
      </div>
      
      {/* Statistiques par filière */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'major' ? null : 'major')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Par filière</h3>
          </div>
          {expandedSection === 'major' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'major' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="space-y-3">
              {by_major && by_major.map(major => (
                <div key={major.name} className="bg-slate-800/60 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{major.name}</span>
                    <span className="text-purple-400 text-sm">{major.placement_rate}%</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">✅ {major.placed} placés</span>
                    <span className="text-yellow-400">⏳ {major.unplaced} en recherche</span>
                    <span className="text-slate-400">📊 Total: {major.total}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${major.placement_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Statistiques par promotion */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'year' ? null : 'year')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Par promotion</h3>
          </div>
          {expandedSection === 'year' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'year' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="space-y-3">
              {by_graduation_year && by_graduation_year.sort((a,b) => b.year - a.year).map(year => (
                <div key={year.year} className="bg-slate-800/60 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Promotion {year.year}</span>
                    <span className="text-purple-400 text-sm">{year.placement_rate}%</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">✅ {year.placed} placés</span>
                    <span className="text-yellow-400">⏳ {year.unplaced} en recherche</span>
                    <span className="text-slate-400">📊 Total: {year.total}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${year.placement_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Top compétences */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Top compétences</h3>
          </div>
          {expandedSection === 'skills' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'skills' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle size={16} /> Étudiants placés
                </h4>
                <div className="space-y-2">
                  {top_skills && top_skills.placed && top_skills.placed.slice(0, 8).map(skill => (
                    <div key={skill.skill} className="flex justify-between items-center bg-green-500/10 rounded-lg p-2">
                      <span className="text-white text-sm">{skill.skill}</span>
                      <span className="text-green-400 text-sm font-semibold">{skill.count} étudiants</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <Clock size={16} /> Étudiants en recherche
                </h4>
                <div className="space-y-2">
                  {top_skills && top_skills.unplaced && top_skills.unplaced.slice(0, 8).map(skill => (
                    <div key={skill.skill} className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-2">
                      <span className="text-white text-sm">{skill.skill}</span>
                      <span className="text-yellow-400 text-sm font-semibold">{skill.count} étudiants</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Timeline des placements */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'timeline' ? null : 'timeline')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Évolution des placements</h3>
          </div>
          {expandedSection === 'timeline' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'timeline' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="space-y-3">
              {timeline && timeline.map(item => (
                <div key={item.month} className="bg-slate-800/60 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white text-sm">{item.month}</span>
                    <span className="text-green-400 text-sm font-semibold">{item.placed} placements</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(100, item.placed * 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ManageStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [placementStats, setPlacementStats] = useState(null);
  const [university, setUniversity] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    major: '',
    wilaya: '',
    skills: '',
    is_placed: ''
  });
  
  const [majors, setMajors] = useState([]);
  const [wilayasList] = useState([
    'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
    'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
    'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
    'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
    "M'Sila",'Mascara','Ouargla','Oran','El Bayadh','Illizi',
    'Bordj Bou Arreridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
    'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla',
    'Naâma','Aïn Témouchent','Ghardaïa','Relizane'
  ]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.major) params.append('major', filters.major);
      if (filters.wilaya) params.append('wilaya', filters.wilaya);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.is_placed) params.append('is_placed', filters.is_placed);
      
      const res = await fetch(`${API}/admin/university-students/?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setStats(data.stats);
        setUniversity(data.university);
        
        const uniqueMajors = [...new Set(data.students.map(s => s.major).filter(Boolean))];
        setMajors(uniqueMajors);
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error("Erreur:", err);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/admin/placement-stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setPlacementStats(data.stats);
      }
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchPlacementStats();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      major: '',
      wilaya: '',
      skills: '',
      is_placed: ''
    });
  };

  const isDeptHead = user?.sub_role === 'admin';
  const isCoDeptHead = user?.sub_role === 'co_dept_head';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(isDeptHead ? '/admin/dashboard' : '/co-dept-head/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={18} />
                Retour
              </button>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">Gestion des Étudiants</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
              >
                <BarChart3 size={16} />
                {showStats ? 'Voir étudiants' : 'Statistiques'}
              </button>
              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {isDeptHead ? 'Department Head' : 'Co Department Head'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Université */}
        <div className="mb-6">
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4 inline-block">
            <p className="text-white">
              <span className="text-purple-400">🏛️ Université :</span> {university}
            </p>
          </div>
        </div>

        {showStats ? (
          <StatisticsPanel stats={placementStats} loading={statsLoading} />
        ) : (
          <>
            {/* Filtres */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 mb-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition mb-4"
              >
                <Filter size={16} />
                {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
              </button>
              
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Recherche</label>
                    <input
                      type="text"
                      placeholder="Nom ou filière..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Filière</label>
                    <select
                      value={filters.major}
                      onChange={(e) => handleFilterChange('major', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Toutes</option>
                      {majors.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Wilaya</label>
                    <select
                      value={filters.wilaya}
                      onChange={(e) => handleFilterChange('wilaya', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Toutes</option>
                      {wilayasList.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Compétences</label>
                    <input
                      type="text"
                      placeholder="React, Python,..."
                      value={filters.skills}
                      onChange={(e) => handleFilterChange('skills', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Statut</label>
                    <select
                      value={filters.is_placed}
                      onChange={(e) => handleFilterChange('is_placed', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Tous</option>
                      <option value="true">Stage trouvé</option>
                      <option value="false">En recherche</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-4 gap-3">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={fetchStudents}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition"
                >
                  Rechercher
                </button>
              </div>
            </div>

            {/* Liste des étudiants */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Étudiants ({stats.filtered || students.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucun étudiant trouvé</h3>
                <p className="text-white/60">Aucun étudiant ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {students.map(student => (
                  <StudentCard 
                    key={student.id} 
                    student={student} 
                    onClick={setSelectedStudent} 
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selectedStudent && (
        <StudentDetailsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  );
}