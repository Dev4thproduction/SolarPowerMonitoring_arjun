import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, History, Database, Cloud } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight">System Settings</h1>
                <p className="text-muted-foreground font-medium mt-1">Manage your enterprise profile and system preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border-2 border-muted-foreground/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl text-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-primary mx-auto mb-6 flex items-center justify-center text-primary-foreground text-4xl font-black shadow-2xl shadow-primary/20">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-2xl font-black break-words">{user?.username}</h2>
                        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full mt-4">
                            <Shield size={14} className="text-primary" />
                            <span className="text-xs font-black uppercase text-primary tracking-widest">{user?.role}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-6 font-medium leading-relaxed italic">
                            Authorized personnel for industrial solar infrastructure monitoring.
                        </p>
                    </div>

                    <div className="bg-muted/10 border rounded-[2rem] p-6">
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Account Metadata</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs gap-2">
                                <span className="text-muted-foreground font-semibold whitespace-nowrap">User ID</span>
                                <code className="bg-muted px-2 py-0.5 rounded text-[10px] truncate">{user?.id?.slice(-8).toUpperCase()}</code>
                            </div>
                            <div className="flex justify-between items-center text-xs gap-2">
                                <span className="text-muted-foreground font-semibold whitespace-nowrap">Session Tier</span>
                                <span className="font-bold truncate">Enterprise Steel</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Panels */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-card border-2 border-muted-foreground/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <Key size={20} className="text-primary" /> Security & Access
                        </h3>
                        <div className="space-y-1">
                            {[
                                { label: 'Two-Factor Authentication', status: 'Disabled', action: 'Enable' },
                                { label: 'Password Encryption', status: 'AES-256', action: 'Update' },
                                { label: 'Session Timeout', status: '8 Hours', action: 'Change' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 rounded-2xl transition-all cursor-not-allowed group gap-2">
                                    <span className="text-sm font-bold">{item.label}</span>
                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground/40">{item.status}</span>
                                        <button className="text-[10px] font-black uppercase text-primary opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">{item.action}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border-2 border-muted-foreground/10 rounded-[2.5rem] p-6 sm:p-8 shadow-xl">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <Database size={20} className="text-primary" /> Data Infrastructure
                        </h3>
                        <div className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2">
                                <span className="text-sm font-bold flex items-center gap-2">
                                    <Cloud size={16} className="text-blue-500" /> API Environment
                                </span>
                                <span className="text-[11px] font-bold bg-green-500/10 text-green-500 px-3 py-1 rounded-lg w-fit">Connected</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2">
                                <span className="text-sm font-bold flex items-center gap-2">
                                    <History size={16} className="text-purple-500" /> Retention Policy
                                </span>
                                <span className="text-[11px] font-bold text-muted-foreground">365 Days Historical</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
