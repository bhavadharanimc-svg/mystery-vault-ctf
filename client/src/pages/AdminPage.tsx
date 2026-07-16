import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, Zap, Settings, Trophy, Download, RefreshCw,
  Snowflake, Plus, Trash2, Edit3, Save, X,
  Shield, BarChart2, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParticleField from '../components/ParticleField';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'teams', label: 'Teams', icon: <Users className="w-4 h-4" /> },
  { id: 'challenges', label: 'Challenges', icon: <Zap className="w-4 h-4" /> },
  { id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
];

export default function AdminPage() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [teams, setTeams] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [frozen, setFrozen] = useState(false);

  // Team form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPin, setNewTeamPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Challenge form
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '', description: '', story: '', hints: '', flag: '',
    points: 50, difficulty: 'easy', category: 'misc', round_number: 1, order_in_round: 1
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    try {
      const [teamsRes, challengesRes, configRes, lbRes, statsRes] = await Promise.all([
        axios.get('/api/admin/teams'),
        axios.get('/api/admin/challenges'),
        axios.get('/api/admin/config'),
        axios.get('/api/leaderboard'),
        axios.get('/api/admin/stats'),
      ]);
      setTeams(teamsRes.data.teams);
      setChallenges(challengesRes.data.challenges);
      setConfig(configRes.data.config);
      setLeaderboard(lbRes.data.teams);
      setFrozen(lbRes.data.frozen);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/teams', { name: newTeamName, pin: newTeamPin });
      toast.success(`Team "${newTeamName}" created with PIN ${newTeamPin}`);
      setNewTeamName(''); setNewTeamPin('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteTeam = async (id: number, name: string) => {
    if (!confirm(`Delete team "${name}"? This is irreversible.`)) return;
    await axios.delete(`/api/admin/teams/${id}`);
    toast.success('Team deleted');
    fetchAll();
  };

  const submitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(challengeForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (attachmentFile) fd.append('attachment', attachmentFile);

      if (editingChallenge) {
        await axios.put(`/api/admin/challenges/${editingChallenge.id}`, fd);
        toast.success('Challenge updated');
      } else {
        await axios.post('/api/admin/challenges', fd);
        toast.success('Challenge created');
      }
      setShowChallengeForm(false);
      setEditingChallenge(null);
      setChallengeForm({ title: '', description: '', story: '', hints: '', flag: '', points: 50, difficulty: 'easy', category: 'misc', round_number: 1, order_in_round: 1 });
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteChallenge = async (id: number) => {
    if (!confirm('Delete this challenge?')) return;
    await axios.delete(`/api/admin/challenges/${id}`);
    toast.success('Challenge deleted');
    fetchAll();
  };

  const saveConfig = async () => {
    try {
      await axios.put('/api/admin/config', config);
      toast.success('Configuration saved');
    } catch { toast.error('Failed to save config'); }
  };

  const toggleFreeze = async () => {
    const { data } = await axios.post('/api/admin/freeze');
    setFrozen(data.frozen);
    toast.success(data.frozen ? '🔒 Leaderboard frozen' : '🔓 Leaderboard unfrozen');
    fetchAll();
  };

  const resetCompetition = async () => {
    if (!confirm('RESET ALL COMPETITION DATA? This cannot be undone!')) return;
    await axios.post('/api/admin/reset');
    toast.success('Competition reset');
    fetchAll();
  };

  const exportCSV = () => {
    window.open('/api/admin/export', '_blank');
  };

  const openEditChallenge = (c: any) => {
    setEditingChallenge(c);
    setChallengeForm({
      title: c.title, description: c.description, story: c.story,
      hints: Array.isArray(c.hints) ? c.hints.join('\n') : '',
      flag: c.flag, points: c.points, difficulty: c.difficulty,
      category: c.category, round_number: c.round_number, order_in_round: c.order_in_round
    });
    setShowChallengeForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040810] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040810] relative">
      <ParticleField />
      <div className="crt-overlay" />

      {/* Admin Navbar */}
      <nav className="sticky top-0 z-40 glass-dark border-b border-purple-400/20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.7))' }} />
            <span className="font-terminal font-bold text-purple-300 text-sm">ADMIN CONTROL CENTER</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-terminal text-xs text-green-400 border border-green-400/20 hover:border-green-400/40 transition-all">
              <Download className="w-3 h-3" /> Export CSV
            </button>
            <button onClick={toggleFreeze} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-terminal text-xs border transition-all
              ${frozen ? 'text-blue-400 border-blue-400/40 bg-blue-400/10' : 'text-cyan-400 border-cyan-400/20 hover:border-cyan-400/40'}`}>
              <Snowflake className="w-3 h-3" /> {frozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button onClick={resetCompetition} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-terminal text-xs text-red-400 border border-red-400/20 hover:border-red-400/40 transition-all">
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
            <button onClick={() => { logout(); }} className="px-3 py-1.5 rounded-lg font-terminal text-xs text-gray-400 border border-gray-600 hover:text-red-400 transition-all">
              Exit
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-terminal text-sm transition-all
                ${activeTab === tab.id
                  ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300'
                  : 'glass border border-gray-700 text-gray-400 hover:text-purple-300 hover:border-purple-400/20'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Teams', value: stats.totalTeams, color: 'text-cyan-400', icon: '👥' },
                { label: 'Total Submissions', value: stats.totalSubmissions, color: 'text-purple-400', icon: '📨' },
                { label: 'Correct Flags', value: stats.correctSubmissions, color: 'text-green-400', icon: '✅' },
                { label: 'Challenges', value: stats.activeChallenges, color: 'text-yellow-400', icon: '🎯' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-5 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`font-terminal text-3xl font-black ${s.color}`}>{s.value ?? '—'}</div>
                  <div className="font-terminal text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-5">
              <h3 className="font-terminal text-sm text-purple-300 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Add Team', tab: 'teams', icon: '👤' },
                  { label: 'Add Challenge', tab: 'challenges', icon: '🎯' },
                  { label: 'Edit Config', tab: 'config', icon: '⚙️' },
                ].map(a => (
                  <button key={a.label} onClick={() => { setActiveTab(a.tab); if (a.tab === 'challenges') setShowChallengeForm(true); }}
                    className="glass p-4 rounded-xl font-terminal text-sm text-gray-300 hover:text-white hover:border-purple-400/30 border border-gray-700 transition-all text-center">
                    <div className="text-2xl mb-1">{a.icon}</div>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Create team */}
            <div className="glass rounded-xl p-6">
              <h3 className="font-terminal text-sm text-cyan-300 mb-4">Create New Team</h3>
              <form onSubmit={createTeam} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Team Name" className="input-neon flex-1 rounded-xl px-4 py-2.5 font-terminal text-sm" />
                <div className="relative">
                  <input type={showPin ? 'text' : 'password'} value={newTeamPin}
                    onChange={e => setNewTeamPin(e.target.value.slice(0, 4))}
                    placeholder="4-digit PIN" maxLength={4}
                    className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm w-36 pr-10" />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/40 hover:text-cyan-400">
                    {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <button type="submit"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-terminal text-sm font-bold
                    bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:border-cyan-400/70 transition-all">
                  <Plus className="w-4 h-4" /> Create
                </button>
              </form>
            </div>

            {/* Teams list */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 px-6 py-3 border-b border-cyan-400/10 bg-cyan-400/5 font-terminal text-xs text-cyan-400/60 uppercase tracking-widest">
                {['Team', 'Score', 'Solved', 'Round', 'Actions'].map(h => <div key={h}>{h}</div>)}
              </div>
              {teams.map(team => (
                <div key={team.id} className="grid grid-cols-5 px-6 py-4 border-b border-cyan-400/5 hover:bg-cyan-400/3 items-center">
                  <div className="font-terminal text-sm text-white">{team.name}</div>
                  <div className="font-terminal text-sm text-yellow-400">{team.score}</div>
                  <div className="font-terminal text-sm text-purple-400">{team.challenges_solved}</div>
                  <div className="font-terminal text-xs text-gray-400">
                    {['Easy','Medium','Hard'][team.current_round - 1]}
                  </div>
                  <button onClick={() => deleteTeam(team.id, team.name)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {teams.length === 0 && (
                <div className="py-12 text-center font-terminal text-gray-600">No teams yet</div>
              )}
            </div>
          </motion.div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-terminal text-lg text-white">Challenges ({challenges.length})</h2>
              <button onClick={() => { setShowChallengeForm(true); setEditingChallenge(null); setChallengeForm({ title: '', description: '', story: '', hints: '', flag: '', points: 50, difficulty: 'easy', category: 'misc', round_number: 1, order_in_round: 1 }); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-terminal text-sm
                  bg-green-500/20 border border-green-400/40 text-green-300 hover:border-green-400/70 transition-all">
                <Plus className="w-4 h-4" /> Add Challenge
              </button>
            </div>

            {/* Challenge form modal */}
            <AnimatePresence>
              {showChallengeForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass rounded-xl p-6 border border-purple-400/30"
                >
                  <div className="flex justify-between mb-4">
                    <h3 className="font-terminal text-purple-300">{editingChallenge ? 'Edit' : 'New'} Challenge</h3>
                    <button onClick={() => setShowChallengeForm(false)} className="text-gray-500 hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={submitChallenge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={challengeForm.title} onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Title *" className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm" required />
                    <input value={challengeForm.flag} onChange={e => setChallengeForm(p => ({ ...p, flag: e.target.value }))}
                      placeholder="flag{answer} *" className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm" required />
                    <select value={challengeForm.difficulty} onChange={e => setChallengeForm(p => ({ ...p, difficulty: e.target.value as any }))}
                      className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm">
                      <option value="easy">Easy (Round 1)</option>
                      <option value="medium">Medium (Round 2)</option>
                      <option value="hard">Hard (Round 3)</option>
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={challengeForm.points} onChange={e => setChallengeForm(p => ({ ...p, points: parseInt(e.target.value) }))}
                        placeholder="Points" className="input-neon rounded-xl px-3 py-2.5 font-terminal text-sm" />
                      <input type="number" value={challengeForm.round_number} onChange={e => setChallengeForm(p => ({ ...p, round_number: parseInt(e.target.value) }))}
                        placeholder="Round" min={1} max={3} className="input-neon rounded-xl px-3 py-2.5 font-terminal text-sm" />
                      <input type="number" value={challengeForm.order_in_round} onChange={e => setChallengeForm(p => ({ ...p, order_in_round: parseInt(e.target.value) }))}
                        placeholder="Order" min={1} max={3} className="input-neon rounded-xl px-3 py-2.5 font-terminal text-sm" />
                    </div>
                    <input value={challengeForm.category} onChange={e => setChallengeForm(p => ({ ...p, category: e.target.value }))}
                      placeholder="Category (e.g. Crypto, Web)" className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm" />
                    <div className="relative">
                      <label className="absolute -top-2 left-3 text-xs font-terminal text-purple-400/60 bg-[#040810] px-1">Attachment</label>
                      <input type="file" onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                        className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm w-full text-gray-400" />
                    </div>
                    <textarea value={challengeForm.description} onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Description" rows={2}
                      className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm md:col-span-2" />
                    <textarea value={challengeForm.story} onChange={e => setChallengeForm(p => ({ ...p, story: e.target.value }))}
                      placeholder="Story / Mission Briefing" rows={3}
                      className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm md:col-span-2" />
                    <textarea value={challengeForm.hints} onChange={e => setChallengeForm(p => ({ ...p, hints: e.target.value }))}
                      placeholder="Hints (one per line)" rows={3}
                      className="input-neon rounded-xl px-4 py-2.5 font-terminal text-sm md:col-span-2" />
                    <div className="md:col-span-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setShowChallengeForm(false)}
                        className="px-4 py-2 rounded-xl font-terminal text-sm text-gray-400 border border-gray-600 hover:border-gray-400 transition-all">
                        Cancel
                      </button>
                      <button type="submit"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-terminal text-sm
                          bg-purple-500/20 border border-purple-400/40 text-purple-300 hover:border-purple-400/70 transition-all">
                        <Save className="w-4 h-4" /> {editingChallenge ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Challenges table */}
            <div className="glass rounded-xl overflow-hidden">
              {[1, 2, 3].map(round => (
                <div key={round}>
                  <div className="px-6 py-2 bg-gray-800/50 font-terminal text-xs text-gray-500 uppercase">
                    Round {round} — {['Easy', 'Medium', 'Hard'][round - 1]}
                  </div>
                  {challenges.filter(c => c.round_number === round).map(c => (
                    <div key={c.id} className="grid grid-cols-4 md:grid-cols-6 px-6 py-3 border-b border-gray-800 hover:bg-purple-400/3 items-center gap-4">
                      <div className="font-terminal text-sm text-white col-span-2 md:col-span-1">{c.title}</div>
                      <div className="font-terminal text-xs text-gray-400 hidden md:block">{c.category}</div>
                      <div className="font-terminal text-xs text-yellow-400">{c.points}pts</div>
                      <div className="font-terminal text-xs text-green-400/60 hidden md:block font-mono truncate max-w-[200px]">{c.flag}</div>
                      <div className="hidden md:block" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEditChallenge(c)}
                          className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteChallenge(c.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Registration toggle */}
            <div className="glass rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="font-terminal text-sm text-white mb-0.5">Team Self-Registration</div>
                <div className="font-terminal text-xs text-gray-500">
                  Allow teams to register themselves on the login page
                </div>
              </div>
              <button
                onClick={async () => {
                  const newVal = config.registration_open === '1' ? '0' : '1';
                  setConfig((prev: any) => ({ ...prev, registration_open: newVal }));
                  await axios.put('/api/admin/config', { registration_open: newVal });
                  toast.success(newVal === '1' ? '✅ Registration opened' : '🔒 Registration closed');
                }}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 border
                  ${config.registration_open === '1'
                    ? 'bg-green-500/30 border-green-400/50'
                    : 'bg-gray-700 border-gray-600'
                  }`}
              >
                <motion.div
                  animate={{ x: config.registration_open === '1' ? 28 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`absolute top-1 w-5 h-5 rounded-full
                    ${config.registration_open === '1' ? 'bg-green-400' : 'bg-gray-400'}`}
                />
              </button>
            </div>

            <div className="glass rounded-xl p-6 space-y-5">
              <h3 className="font-terminal text-cyan-300 mb-2">Competition Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { key: 'easy_time_minutes', label: 'Easy Round Time (minutes)' },
                  { key: 'medium_time_minutes', label: 'Medium Round Time (minutes)' },
                  { key: 'hard_time_minutes', label: 'Hard Round Time (minutes)' },
                  { key: 'easy_qualify_score', label: 'Easy → Medium Qualifying Score' },
                  { key: 'medium_qualify_score', label: 'Medium → Hard Qualifying Score' },
                  { key: 'first_blood_bonus', label: 'First Blood Bonus Points' },
                  { key: 'speed_bonus', label: 'Speed Bonus Points' },
                  { key: 'speed_bonus_minutes', label: 'Speed Bonus Window (minutes)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block font-terminal text-xs text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={config[key] || ''}
                      onChange={e => setConfig((prev: any) => ({ ...prev, [key]: e.target.value }))}
                      className="input-neon w-full rounded-xl px-4 py-2.5 font-terminal text-sm"
                    />
                  </div>
                ))}
              </div>
              <button onClick={saveConfig}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-terminal text-sm font-bold
                  bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:border-cyan-400/70 transition-all">
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            </div>
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              {frozen && (
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/40 text-blue-400 font-terminal text-xs rounded-full">
                  🔒 FROZEN
                </span>
              )}
              <button onClick={fetchAll} className="flex items-center gap-1 text-xs font-terminal text-gray-400 hover:text-cyan-400">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 px-6 py-3 border-b border-cyan-400/10 bg-cyan-400/5 font-terminal text-xs text-cyan-400/60 uppercase">
                {['#', 'Team', 'Score', 'Solved', 'Round', 'Last Flag'].map(h => <div key={h}>{h}</div>)}
              </div>
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className="grid grid-cols-6 px-6 py-3 border-b border-gray-800 hover:bg-cyan-400/3 items-center">
                  <div className={`font-terminal font-bold ${i < 3 ? ['text-yellow-400','text-gray-300','text-amber-600'][i] : 'text-gray-600'}`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `#${entry.rank}`}
                  </div>
                  <div className="font-terminal text-sm text-white">{entry.name}</div>
                  <div className="font-terminal text-sm text-yellow-400 font-bold">{entry.score}</div>
                  <div className="font-terminal text-sm text-purple-400">{entry.challenges_solved}</div>
                  <div className={`font-terminal text-xs ${['text-green-400','text-yellow-400','text-red-400'][entry.current_round - 1]}`}>
                    {['Easy','Medium','Hard'][entry.current_round - 1]}
                  </div>
                  <div className="font-terminal text-xs text-gray-500">
                    {entry.last_submission ? new Date(entry.last_submission).toLocaleTimeString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
