import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useConfirmation } from './ConfirmationContext';
import { ArrowLeft, Plus, Trash2, Key, Shield, User, Menu } from 'lucide-react';
import MenuDrawer from './MenuDrawer';

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

    // Only admin can access
    if (!isAdmin) {
        navigate('/');
        return null;
    }

    const handleAddUser = () => {
        if (!newUsername.trim() || !newPassword.trim()) return;
        addUser({
            username: newUsername.trim(),
            password: newPassword.trim(),
            role: newRole,
            name: newUsername.trim()
        });
        setNewUsername('');
        setNewPassword('');
        setNewRole('employee');
        setShowAddForm(false);
    };

    const handleDeleteUser = async (userId, username) => {
        if (userId === currentUser?.id) return; // Can't delete yourself
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
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {u.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{u.name || u.username}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
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
                    ))}

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
                                    disabled={!newUsername.trim() || !newPassword.trim()}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                >
                                    {t('save') || 'Save'}
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewUsername(''); setNewPassword(''); }}
                                    className="flex-1 py-2.5 rounded-lg bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 active:scale-[0.98] transition-all"
                                >
                                    {t('cancel') || 'Cancel'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </>
    );
}
