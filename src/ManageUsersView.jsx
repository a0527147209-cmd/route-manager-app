import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useConfirmation } from './ConfirmationContext';
import { ArrowLeft, Plus, Trash2, Key, Shield, User, Menu, Clock } from 'lucide-react';
import MenuDrawer from './MenuDrawer';

function formatLastLogin(isoStr, t) {
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

function isOnline(lastSeen) {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 2 * 60 * 1000; // Online if seen in last 2 minutes
}

export default function ManageUsersView() {
    const navigate = useNavigate();
    const { users, addUser, removeUser, isAdmin, user: currentUser } = useAuth();
    const { t, isRtl } = useLanguage();
    const { confirm } = useConfirmation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('employee');
    const [addStatus, setAddStatus] = useState('');

    // Auto-refresh every 30 seconds to update online status
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    // Only admin can access
    if (!isAdmin) {
        navigate('/');
        return null;
    }

    const handleAddUser = async () => {
        if (!newUsername.trim() || !newPassword.trim()) return;
        setAddStatus('Creating...');
        const result = await addUser({
            username: newUsername.trim(),
            password: newPassword.trim(),
            role: newRole,
            name: newUsername.trim()
        });
        if (result?.success) {
            setNewUsername('');
            setNewPassword('');
            setNewRole('employee');
            setShowAddForm(false);
            setAddStatus('✅ User created!');
            setTimeout(() => setAddStatus(''), 3000);
        } else {
            setAddStatus('❌ ' + (result?.error || 'Failed to create user'));
            setTimeout(() => setAddStatus(''), 5000);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (userId === currentUser?.id) return;
        if (await confirm({
            title: t('deleteUser') || 'Delete User',
            message: `${t('confirmDeleteUser') || 'Are you sure you want to delete'} "${username}"?`,
            confirmText: t('delete') || 'Delete',
            cancelText: t('cancel') || 'Cancel',
            isDelete: true
        })) {
            removeUser(userId);
        }
    };

    return (
        <>
            <div className={`min-h-screen bg-background ${isRtl ? 'text-right' : 'text-left'}`}>
                {/* Header */}
                <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
                    <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground active:scale-95"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-lg font-bold text-foreground">{t('manageUsers') || 'Manage Users'}</h1>
                        </div>
                        <button
                            onClick={() => setMenuOpen(true)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground active:scale-95"
                        >
                            <Menu size={22} />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-3 max-w-lg mx-auto">
                    {/* Users List */}
                    {users.map((u) => {
                        const online = isOnline(u.lastSeen);
                        return (
                            <div
                                key={u.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar with presence dot */}
                                    <div className="relative">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                            {u.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                        </div>
                                        {/* Glowing presence indicator */}
                                        <span
                                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${online
                                                ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.6)]'
                                                : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                            style={online ? { animation: 'pulse-soft 2s ease-in-out infinite' } : {}}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-bold text-foreground">{u.name || u.username}</p>
                                            {online && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">{t('online') || 'Online'}</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={10} className="text-muted-foreground/60" />
                                            <p className="text-[10px] text-muted-foreground/80">{formatLastLogin(u.lastLogin, t)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {u.id !== currentUser?.id && (
                                        <button
                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95"
                                            title={t('deleteUser') || 'Delete User'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add User Button / Form */}
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors font-semibold text-sm active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            <span>{t('addUser') || 'Add User'}</span>
                        </button>
                    ) : (
                        <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3">
                            <h3 className="text-sm font-bold text-foreground">{t('addUser') || 'Add User'}</h3>
                            <input
                                type="text"
                                placeholder={t('username') || 'Username'}
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full p-2.5 text-sm bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            />
                            <input
                                type="text"
                                placeholder={t('password') || 'Password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2.5 text-sm bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            />
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                className="w-full p-2.5 text-sm bg-muted/50 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            >
                                <option value="employee">{t('employee') || 'Employee'}</option>
                                <option value="admin">{t('admin') || 'Admin'}</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddUser}
                                    disabled={!newUsername.trim() || !newPassword.trim() || addStatus === 'Creating...'}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                >
                                    {addStatus === 'Creating...' ? 'Creating...' : (t('save') || 'Save')}
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewUsername(''); setNewPassword(''); setAddStatus(''); }}
                                    className="flex-1 py-2.5 rounded-lg bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 active:scale-[0.98] transition-all"
                                >
                                    {t('cancel') || 'Cancel'}
                                </button>
                            </div>
                            {addStatus && addStatus !== 'Creating...' && (
                                <p className="text-xs text-center font-medium mt-1">{addStatus}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </>
    );
}
