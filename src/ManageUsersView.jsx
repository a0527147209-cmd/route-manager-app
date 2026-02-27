import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useLocations } from './LocationsContext';
import { useConfirmation } from './ConfirmationContext';
import {
  Plus, Trash2, Shield, User, Menu, Clock, Search,
  ChevronDown, ChevronUp, X, SlidersHorizontal,
  Truck, MapPin, Activity, Eye,
  CheckCircle, Coffee, Wifi, WifiOff,
  Package, Edit3, Save, Users, BarChart3,
  LogIn, DollarSign, FileText, UserPlus, ArrowUpDown,
  Wrench, AlertTriangle, Tag
} from 'lucide-react';
import BackButton from './BackButton';
import MenuDrawer from './MenuDrawer';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  { value: 'technician', label: 'Technician', icon: Wrench, bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { value: 'routeDriver', label: 'Route Driver', icon: Truck, bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'moneyCollector', label: 'Collector', icon: DollarSign, bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  { value: 'employee', label: 'Employee', icon: User, bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
];

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]));

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getUserPresence(user) {
  if (user.shiftStatus === 'onBreak') return 'onBreak';
  if (!user.lastSeen) return 'offline';
  const diff = Date.now() - new Date(user.lastSeen).getTime();
  if (diff < 2 * 60 * 1000) return 'onShift';
  return 'offline';
}

function formatRelativeTime(isoStr, t) {
  if (!isoStr) return t?.('neverLoggedIn') || 'Never';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t?.('justNow') || 'Just now';
  if (diffMin < 60) return `${diffMin} ${t?.('minutesAgo') || 'min ago'}`;
  if (diffHours < 24) return `${diffHours} ${t?.('hoursAgo') || 'hours ago'}`;
  if (diffDays === 1) return t?.('yesterday') || 'Yesterday';
  if (diffDays < 7) return `${diffDays} ${t?.('daysAgo') || 'days ago'}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateAuditEvents(user, locations) {
  const events = [];

  if (user.createdAt) {
    events.push({
      type: 'account', timestamp: user.createdAt,
      description: 'Account created', icon: UserPlus, color: 'text-emerald-500',
    });
  }

  if (user.lastLogin) {
    events.push({
      type: 'login', timestamp: user.lastLogin,
      description: 'Signed in', icon: LogIn, color: 'text-indigo-500',
    });
  }

  locations.forEach(loc => {
    (loc.logs || []).forEach(log => {
      const isThisUser = log.userId === user.id || log.logUser === user.name || log.logUser === user.username;
      if (!isThisUser) return;

      const ts = log.date ? `${log.date}T12:00:00` : null;
      if (!ts) return;

      events.push({
        type: 'visit', timestamp: ts,
        description: `Visited ${loc.businessName || loc.name || 'Unknown'}`,
        detail: log.collection ? `Collected: ${parseFloat(log.collection).toFixed(1)} lbs` : null,
        icon: MapPin, color: 'text-sky-500',
      });

      if (log.collection && parseFloat(log.collection) > 0) {
        events.push({
          type: 'collection', timestamp: ts,
          description: `Cash collection at ${loc.businessName || loc.name || 'Unknown'}`,
          detail: `${parseFloat(log.collection).toFixed(1)} lbs`,
          icon: DollarSign, color: 'text-amber-500',
        });
      }
    });
  });

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events.slice(0, 50);
}

/* ─── Sub-Components ─── */

function UserAvatar({ user, size = 'md', onClick }) {
  const dim = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-[13px]' : 'text-[11px]';
  const role = ROLE_MAP[user.role] || ROLE_MAP.employee;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dim} rounded-full flex items-center justify-center font-bold ${textSize} ${role.bg} ${role.text} ring-2 ring-white dark:ring-slate-900 transition-transform active:scale-95 select-none shrink-0`}
    >
      {getInitials(user.name || user.username)}
    </button>
  );
}

function StatusDot({ status, size = 'md' }) {
  const dim = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const border = size === 'lg' ? 'border-[3px]' : 'border-2';
  const colors = {
    onShift: 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]',
    onBreak: 'bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]',
    offline: 'bg-slate-300 dark:bg-slate-600',
  };

  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 ${dim} rounded-full ${border} border-white dark:border-slate-900 ${colors[status] || colors.offline}`}
      style={status === 'onShift' ? { animation: 'pulse-soft 2s ease-in-out infinite' } : {}}
    />
  );
}

function RoleBadge({ role }) {
  const r = ROLE_MAP[role] || ROLE_MAP.employee;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${r.bg} ${r.text}`}>
      <Icon size={10} />
      {r.label}
    </span>
  );
}

function StatusBadge({ status, t }) {
  const config = {
    onShift: { label: t('onShift') || 'On Shift', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: Wifi },
    onBreak: { label: t('onBreak') || 'On Break', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: Coffee },
    offline: { label: t('offline') || 'Offline', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', icon: WifiOff },
  };
  const c = config[status] || config.offline;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>
      <Icon size={9} />
      {c.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[72px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <span className="text-[17px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{label}</span>
    </div>
  );
}

function KPIChip({ icon: Icon, label, value, total, color }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${color}`}>
      <Icon size={12} />
      <span>{label}</span>
      <span className="tabular-nums font-bold">{total ? `${value}/${total}` : value}</span>
    </div>
  );
}

/* ─── Audit Trail Panel ─── */

function AuditPanel({ user, events, onClose, t }) {
  const presence = getUserPresence(user);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Panel Header */}
        <div className="shrink-0 p-5 border-b border-slate-200/60 dark:border-slate-800/60" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{t('auditTrail')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserAvatar user={user} size="lg" onClick={() => {}} />
              <StatusDot status={presence} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate">
                {user.name || user.username}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={user.role} />
                <StatusBadge status={presence} t={t} />
              </div>
              {user.area && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin size={10} /> {user.area}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Event Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">{t('noAuditEvents')}</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1">
                {events.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <motion.div
                      key={`${event.type}-${event.timestamp}-${i}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative flex items-start gap-3 pl-0 py-2"
                    >
                      <div className={`relative z-10 w-[30px] h-[30px] rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0`}>
                        <Icon size={13} className={event.color} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                          {event.description}
                        </p>
                        {event.detail && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{event.detail}</p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatRelativeTime(event.timestamp, t)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ─── */

export default function ManageUsersView() {
  const navigate = useNavigate();
  const { users, addUser, removeUser, updateUser, isAdmin, user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();
  const { confirm } = useConfirmation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [auditUser, setAuditUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [addStatus, setAddStatus] = useState('');

  // Inline edit state (per expanded user)
  const [editFields, setEditFields] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  // Security code modal
  const [codePrompt, setCodePrompt] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);

  // Equipment input
  const [equipmentInput, setEquipmentInput] = useState('');

  // Refresh timer for relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  // KPIs per user
  const userKPIs = useMemo(() => {
    const kpis = {};
    users.forEach(u => {
      let todayVisits = 0;
      let totalCollections = 0;
      locations.forEach(loc => {
        (loc.logs || []).forEach(log => {
          const isThisUser = log.userId === u.id || log.logUser === u.name || log.logUser === u.username;
          if (!isThisUser) return;
          if (log.date === todayStr) {
            todayVisits++;
            const val = parseFloat(log.collection);
            if (!isNaN(val)) totalCollections += val;
          }
        });
      });
      kpis[u.id] = {
        storesVisited: todayVisits,
        totalStores: locations.length,
        todayCollections: Math.round(totalCollections * 20),
        openTickets: 0,
      };
    });
    return kpis;
  }, [users, locations, todayStr]);

  // Filtered + sorted users
  const processedUsers = useMemo(() => {
    let list = [...users];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.area || '').toLowerCase().includes(q) ||
        (u.vehicle || '').toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      list = list.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(u => getUserPresence(u) === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.name || a.username || '').localeCompare(b.name || b.username || '');
          break;
        case 'role':
          cmp = (a.role || '').localeCompare(b.role || '');
          break;
        case 'lastSeen': {
          const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          cmp = bTime - aTime;
          break;
        }
        case 'status': {
          const order = { onShift: 0, onBreak: 1, offline: 2 };
          cmp = (order[getUserPresence(a)] ?? 3) - (order[getUserPresence(b)] ?? 3);
          break;
        }
        default:
          cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [users, searchQuery, roleFilter, statusFilter, sortBy, sortAsc]);

  // Stats
  const stats = useMemo(() => {
    const presenceCounts = { onShift: 0, onBreak: 0, offline: 0 };
    const roleCounts = {};
    users.forEach(u => {
      presenceCounts[getUserPresence(u)]++;
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });
    return { total: users.length, ...presenceCounts, admins: roleCounts.admin || 0 };
  }, [users]);

  // Audit events for selected user
  const auditEvents = useMemo(() => {
    if (!auditUser) return [];
    return generateAuditEvents(auditUser, locations);
  }, [auditUser, locations]);

  // Initialize edit fields when expanding
  const handleExpand = useCallback((userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    const u = users.find(u => u.id === userId);
    if (u) {
      setEditFields({
        role: u.role || 'employee',
        vehicle: u.vehicle || '',
        area: u.area || '',
        equipment: u.equipment || [],
      });
    }
    setEquipmentInput('');
  }, [expandedUserId, users]);

  const handleSaveUserFields = async (userId) => {
    setSaveStatus(prev => ({ ...prev, [userId]: 'saving' }));
    const result = await updateUser(userId, editFields);
    if (result?.success) {
      setSaveStatus(prev => ({ ...prev, [userId]: 'saved' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [userId]: '' })), 2000);
    } else {
      setSaveStatus(prev => ({ ...prev, [userId]: 'error' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [userId]: '' })), 3000);
    }
  };

  const handleAddEquipment = () => {
    const item = equipmentInput.trim();
    if (!item) return;
    setEditFields(prev => ({
      ...prev,
      equipment: [...(prev.equipment || []), item],
    }));
    setEquipmentInput('');
  };

  const handleRemoveEquipment = (index) => {
    setEditFields(prev => ({
      ...prev,
      equipment: (prev.equipment || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    setAddStatus('Creating...');
    const result = await addUser({
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      name: newUsername.trim(),
    });
    if (result?.success) {
      setNewUsername('');
      setNewPassword('');
      setNewRole('employee');
      setShowAddForm(false);
      setAddStatus('');
    } else {
      setAddStatus(result?.error || 'Failed to create user');
      setTimeout(() => setAddStatus(''), 5000);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!isAdmin || userId === currentUser?.id) return;
    const confirmed = await confirm({
      title: t('deleteUser') || 'Delete User',
      message: `${t('confirmDeleteUser') || 'Are you sure you want to delete'} "${username}"?`,
      confirmText: t('delete') || 'Delete',
      cancelText: t('cancel') || 'Cancel',
      isDelete: true,
    });
    if (confirmed) {
      setCodePrompt({ userId, username });
      setCodeInput('');
      setCodeError(false);
    }
  };

  const handleCodeSubmit = () => {
    if (codeInput === '123456') {
      removeUser(codePrompt.userId);
      setCodePrompt(null);
      setCodeInput('');
      setCodeError(false);
      if (expandedUserId === codePrompt.userId) setExpandedUserId(null);
    } else {
      setCodeError(true);
    }
  };

  const inputClass = "w-full p-2.5 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

  return (
    <>
      <div className={`h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>

        {/* ─── Header ─── */}
        <header
          className="shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="max-w-2xl mx-auto w-full px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BackButton onClick={() => navigate(-1)} />
              <div>
                <h1 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                  {t('teamDashboard') || 'Team Dashboard'}
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {stats.total} {t('totalMembers') || 'members'} · {stats.onShift} {t('onlineNow') || 'online'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>
        </header>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* ─── Main Scrollable Area ─── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4">

            {/* ─── Quick Stats ─── */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <StatCard icon={Users} label={t('totalMembers') || 'Total'} value={stats.total} color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" />
              <StatCard icon={Wifi} label={t('onlineNow') || 'Online'} value={stats.onShift} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" />
              <StatCard icon={Coffee} label={t('onBreakNow') || 'Break'} value={stats.onBreak} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
              <StatCard icon={Shield} label={t('adminsCount') || 'Admins'} value={stats.admins} color="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400" />
            </div>

            {/* ─── Search Bar ─── */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('searchUsers') || 'Search by name, role, area...'}
                className="w-full pl-9 pr-10 py-2.5 text-[13px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
              />
              <button
                onClick={() => setShowFilters(prev => !prev)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showFilters ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {/* ─── Filters & Sort ─── */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 pb-1">
                    {/* Role filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Role</span>
                      {[{ value: 'all', label: t('allRoles') || 'All' }, ...ROLES].map(r => (
                        <button
                          key={r.value}
                          onClick={() => setRoleFilter(r.value)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${roleFilter === r.value
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Status</span>
                      {[
                        { value: 'all', label: t('allStatuses') || 'All' },
                        { value: 'onShift', label: t('onShift') || 'On Shift' },
                        { value: 'onBreak', label: t('onBreak') || 'On Break' },
                        { value: 'offline', label: t('offline') || 'Offline' },
                      ].map(s => (
                        <button
                          key={s.value}
                          onClick={() => setStatusFilter(s.value)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${statusFilter === s.value
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Sort</span>
                      {[
                        { value: 'name', label: t('sortByName') || 'Name' },
                        { value: 'role', label: t('sortByRole') || 'Role' },
                        { value: 'lastSeen', label: t('sortByLastSeen') || 'Last Seen' },
                        { value: 'status', label: t('sortByStatus') || 'Status' },
                      ].map(s => (
                        <button
                          key={s.value}
                          onClick={() => {
                            if (sortBy === s.value) setSortAsc(prev => !prev);
                            else { setSortBy(s.value); setSortAsc(true); }
                          }}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 flex items-center gap-1 ${sortBy === s.value
                            ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {s.label}
                          {sortBy === s.value && <ArrowUpDown size={10} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── User List ─── */}
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {processedUsers.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <Users size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">{t('noUsersFound')}</p>
                  </motion.div>
                ) : processedUsers.map((u) => {
                  const presence = getUserPresence(u);
                  const isExpanded = expandedUserId === u.id;
                  const kpi = userKPIs[u.id] || {};
                  const isSelf = u.id === currentUser?.id;
                  const status = saveStatus[u.id];

                  return (
                    <motion.div
                      key={u.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="flex items-center gap-3 p-3.5">
                        <div className="relative">
                          <UserAvatar user={u} onClick={() => setAuditUser(u)} />
                          <StatusDot status={presence} />
                        </div>

                        <div className="flex-1 min-w-0" onClick={() => handleExpand(u.id)} role="button" tabIndex={0}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {u.name || u.username}
                            </p>
                            <RoleBadge role={u.role} />
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">You</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="text-slate-400 dark:text-slate-500" />
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {formatRelativeTime(u.lastLogin, t)}
                              </span>
                            </div>
                            {u.area && (
                              <div className="flex items-center gap-1">
                                <MapPin size={10} className="text-slate-400 dark:text-slate-500" />
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{u.area}</span>
                              </div>
                            )}
                            {u.vehicle && (
                              <div className="flex items-center gap-1">
                                <Truck size={10} className="text-slate-400 dark:text-slate-500" />
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{u.vehicle}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick KPIs Row */}
                          {u.role !== 'admin' && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <KPIChip
                                icon={CheckCircle} label={t('storesVisited') || 'Visited'}
                                value={kpi.storesVisited || 0} total={kpi.totalStores || 0}
                                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              />
                              {kpi.openTickets > 0 && (
                                <KPIChip
                                  icon={AlertTriangle} label={t('openTickets') || 'Tickets'}
                                  value={kpi.openTickets}
                                  color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => setAuditUser(u)}
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors active:scale-95"
                            title={t('viewAuditTrail')}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleExpand(u.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      <AnimatePresence>
                        {isExpanded && isAdmin && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800/60">
                              <div className="pt-3 grid grid-cols-2 gap-3">
                                {/* Role Assignment */}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">
                                    {t('assignRole')}
                                  </label>
                                  <select
                                    value={editFields.role || 'employee'}
                                    onChange={e => setEditFields(prev => ({ ...prev, role: e.target.value }))}
                                    className={inputClass + ' cursor-pointer'}
                                  >
                                    {ROLES.map(r => (
                                      <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Area */}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">
                                    {t('areaAssignment')}
                                  </label>
                                  <input
                                    type="text"
                                    value={editFields.area || ''}
                                    onChange={e => setEditFields(prev => ({ ...prev, area: e.target.value }))}
                                    placeholder={t('areaPlaceholder') || 'e.g. Downtown'}
                                    className={inputClass}
                                  />
                                </div>

                                {/* Vehicle */}
                                <div className="col-span-2">
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">
                                    {t('vehicleAssignment')}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <Truck size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <input
                                      type="text"
                                      value={editFields.vehicle || ''}
                                      onChange={e => setEditFields(prev => ({ ...prev, vehicle: e.target.value }))}
                                      placeholder={t('vehiclePlaceholder') || 'e.g. Van #3'}
                                      className={inputClass}
                                    />
                                  </div>
                                </div>

                                {/* Equipment */}
                                <div className="col-span-2">
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">
                                    {t('fieldEquipment')}
                                  </label>
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {(editFields.equipment || []).map((item, idx) => (
                                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        <Package size={10} />
                                        {item}
                                        <button
                                          onClick={() => handleRemoveEquipment(idx)}
                                          className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                          <X size={10} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={equipmentInput}
                                      onChange={e => setEquipmentInput(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddEquipment()}
                                      placeholder={t('equipmentPlaceholder') || 'Add item...'}
                                      className={inputClass + ' flex-1'}
                                    />
                                    <button
                                      onClick={handleAddEquipment}
                                      disabled={!equipmentInput.trim()}
                                      className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors active:scale-95"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* KPI Detail */}
                              {u.role !== 'admin' && (
                                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('quickKPIs')}</p>
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                      <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">{kpi.storesVisited || 0}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('storesVisited')}</p>
                                    </div>
                                    <div>
                                      <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">${kpi.todayCollections || 0}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('todaysEarnings')}</p>
                                    </div>
                                    <div>
                                      <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">{kpi.openTickets || 0}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('openTickets')}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveUserFields(u.id)}
                                  disabled={status === 'saving'}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold text-[13px] hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 active:scale-[0.98] transition-all"
                                >
                                  {status === 'saving' ? (
                                    <>{t('saving')}</>
                                  ) : status === 'saved' ? (
                                    <><CheckCircle size={14} /> {t('saved')}</>
                                  ) : (
                                    <><Save size={14} /> {t('saveChanges')}</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setAuditUser(u)}
                                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[13px] hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                >
                                  <Activity size={14} />
                                  {t('viewAuditTrail')}
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.username)}
                                    className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95"
                                    title={t('deleteUser')}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ─── Add User ─── */}
            {isAdmin && (
              <AnimatePresence mode="wait">
                {!showAddForm ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-indigo-300/40 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors font-semibold text-sm active:scale-[0.98]"
                  >
                    <UserPlus size={18} />
                    <span>{t('addUser') || 'Add User'}</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="add-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] space-y-3"
                  >
                    <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <UserPlus size={15} />
                      {t('addUser') || 'Add User'}
                    </h3>
                    <input
                      type="text"
                      placeholder={t('username') || 'Username'}
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder={t('password') || 'Password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className={inputClass}
                    />
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className={inputClass + ' cursor-pointer'}
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddUser}
                        disabled={!newUsername.trim() || !newPassword.trim() || addStatus === 'Creating...'}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-semibold text-[13px] hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                      >
                        {addStatus === 'Creating...' ? 'Creating...' : (t('save') || 'Save')}
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setNewUsername(''); setNewPassword(''); setAddStatus(''); }}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[13px] hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                    </div>
                    {addStatus && addStatus !== 'Creating...' && (
                      <p className="text-[11px] text-center font-medium text-red-500 mt-1">{addStatus}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

          </div>
        </main>
      </div>

      {/* ─── Audit Trail Panel ─── */}
      <AnimatePresence>
        {auditUser && (
          <AuditPanel
            user={auditUser}
            events={auditEvents}
            onClose={() => setAuditUser(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* ─── Security Code Modal ─── */}
      {codePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/60 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 text-center">
              Enter Security Code
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center">
              Enter the admin code to delete &ldquo;{codePrompt.username}&rdquo;
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              placeholder="000000"
              autoFocus
              className={`w-full p-3 text-center text-lg font-mono tracking-[0.3em] bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border ${codeError ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-200/80 dark:border-slate-700/60'} outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 dark:text-slate-100 ring-1 ring-black/[0.04] dark:ring-white/[0.06]`}
            />
            {codeError && (
              <p className="text-xs text-red-500 text-center font-medium">Wrong code</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCodeSubmit}
                disabled={codeInput.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {t('delete') || 'Delete'}
              </button>
              <button
                onClick={() => { setCodePrompt(null); setCodeInput(''); setCodeError(false); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
