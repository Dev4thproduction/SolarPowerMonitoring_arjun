import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#07090d] p-6 relative overflow-hidden">
            {/* Background Aesthetics */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-primary text-primary-foreground rounded-3xl shadow-2xl shadow-primary/40 mb-6 scale-110">
                        <ShieldCheck size={40} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Enterprise Access</h1>
                    <p className="text-muted-foreground font-semibold">Secure monitoring & control portal</p>
                </div>

                <div className="bg-card/40 backdrop-blur-3xl border-2 border-white/5 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 items-center text-red-500 text-sm font-bold">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0a0c10] border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-primary/50 focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                    placeholder="Enter your handle"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0a0c10] border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-primary/50 focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-primary text-primary-foreground py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Authorize Connection'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-10 text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-30">
                    Proprietary System &copy; 2025 DeepMind Advanced Agentic Coding
                </p>
            </div>
        </div>
    );
};

export default Login;
