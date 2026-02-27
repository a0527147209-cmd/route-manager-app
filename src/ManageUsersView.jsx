import { useState, useEffect, useCallback } from 'react';
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
    return diff < 2 * 60 * 1000;
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

    const [codePrompt, setCodePrompt] = useState(null);
    const [codeInput, setCodeInput] = useState('');
    const [codeError, setCodeError] = useState(false);

    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

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
        } else {
            setCodeError(true);
        }
    };

    return (
        <>
            <div className={`h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
                <header
                    className="shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
                    style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                >
                    <div className="max-w-[520px] mx-auto w-full px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
                            >
                                <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} strokeWidth={1.8} />
                            </button>
                            <h1 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{t('manageUsers') || 'Manage Users'}</h1>
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

                <main className="flex-1 overflow-y-auto p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-3">
                    <div className="max-w-[520px] mx-auto w-full space-y-3">
                        {users.map((u) => {
                            const online = isOnline(u.lastSeen);
                            return (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                {u.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                            </div>
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${online
                                                    ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.6)]'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                    }`}
                                                style={online ? { animation: 'pulse-soft 2s ease-in-out infinite' } : {}}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{u.name || u.username}</p>
                                                {online && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">{t('online') || 'Online'}</span>}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{u.role}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={10} className="text-slate-400 dark:text-slate-500" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatLastLogin(u.lastLogin, t)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isAdmin && u.id !== currentUser?.id && (
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

                        {isAdmin && (
                            <>
                                {!showAddForm ? (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-indigo-300/40 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors font-semibold text-sm active:scale-[0.98]"
                                    >
                                        <Plus size={18} />
                                        <span>{t('addUser') || 'Add User'}</span>
                                    </button>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] space-y-3">
                                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{t('addUser') || 'Add User'}</h3>
                                        <input
                                            type="text"
                                            placeholder={t('username') || 'Username'}
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            className="w-full p-2.5 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                        />
                                        <input
                                            type="text"
                                            placeholder={t('password') || 'Password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full p-2.5 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                        />
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            className="w-full p-2.5 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                        >
                                            <option value="employee">{t('employee') || 'Employee'}</option>
                                            <option value="admin">{t('admin') || 'Admin'}</option>
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
                                            <p className="text-[11px] text-center font-medium text-slate-600 dark:text-slate-300 mt-1">{addStatus}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

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
                            onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
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
