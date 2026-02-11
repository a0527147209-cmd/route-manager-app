import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Lock, User, LogIn } from 'lucide-react';

export default function LoginView() {
    const { login } = useAuth();
    const { t, isRtl } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const result = login(username, password);
        if (!result.success) {
            setError(t('loginError') || 'Invalid username or password');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-[340px] bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
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
                                className={`w-full bg-background border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-foreground outline-none focus:ring-2 focus:ring-primary transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
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
                                className={`w-full bg-background border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-foreground outline-none focus:ring-2 focus:ring-primary transition-all ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <LogIn size={20} />
                        <span>{t('login') || 'Sign In'}</span>
                    </button>
                </form>

                <div className="text-center text-xs text-muted-foreground">
                    {t('defaultLoginInfo') || 'Default: admin / 123'}
                </div>
            </div>
        </div>
    );
}
