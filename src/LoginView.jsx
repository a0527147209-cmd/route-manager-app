import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Lock, User, LogIn, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export default function LoginView() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t, isRtl } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);
    const [setupMsg, setSetupMsg] = useState('');
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        const result = await login(username, password);
        if (!result.success) {
            setError(t('loginError') || 'Invalid username or password');
            setShaking(true);
            setTimeout(() => setShaking(false), 600);
            setIsLoggingIn(false);
        }
        // On success, AppWithAuth will detect the user and switch to AppContent automatically
    };

    const handleSetupAdmin = async () => {
        setIsSettingUp(true);
        setSetupMsg('');
        try {
            // Create admin user in Firebase Auth
            const cred = await createUserWithEmailAndPassword(auth, 'admin@vendingapp.com', '123456');

            // Create Firestore profile with admin role
            await setDoc(doc(db, 'users', cred.user.uid), {
                username: 'admin',
                name: 'Admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            });

            setSetupMsg('✅ Admin created! Username: admin / Password: 123456');
            // Auto-fill the login form
            setUsername('admin');
            setPassword('123456');
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                setSetupMsg('⚠️ Admin already exists. Try logging in with: admin / 123456');
                setUsername('admin');
                setPassword('123456');
            } else {
                setSetupMsg('❌ Error: ' + e.message);
            }
        }
        setIsSettingUp(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 animate-gradient" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

            {/* Floating orbs */}
            <div className="absolute top-1/4 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`relative w-full max-w-[340px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-7 space-y-6 ${shaking ? 'animate-shake' : ''} ${isLoggingIn ? 'pointer-events-none' : ''}`}
                style={isLoggingIn ? { opacity: 0.6 } : {}}
            >

                <div className="text-center space-y-2">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30"
                    >
                        <Lock size={28} className="text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">
                        {t('welcomeBack') || 'Welcome Back'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('loginSubtitle') || 'Sign in to manage your routes'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                            {t('username') || 'Username'}
                        </label>
                        <div className="relative">
                            <User size={18} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-foreground outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                placeholder={t('usernamePlaceholder') || 'Enter username'}
                                autoCapitalize="none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                            {t('password') || 'Password'}
                        </label>
                        <div className="relative">
                            <Lock size={18} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-foreground outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        <LogIn size={20} />
                        <span>{isLoggingIn ? 'Signing in...' : (t('login') || 'Sign In')}</span>
                    </button>
                </form>

                {/* Setup message */}
                {setupMsg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs text-center font-medium"
                    >
                        {setupMsg}
                    </motion.div>
                )}

                {/* First-time setup */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <button
                        onClick={handleSetupAdmin}
                        disabled={isSettingUp}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50"
                    >
                        <Shield size={14} />
                        <span>{isSettingUp ? 'Creating...' : 'First time? Create Admin Account'}</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
