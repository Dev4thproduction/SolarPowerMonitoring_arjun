import React, { useState } from 'react';
import { Home, Sun, BarChart3, Settings, Menu, X, LogOut, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();

    const navItems = [
        { icon: Home, label: 'Dashboard', to: '/' },
        {
            icon: Sun,
            label: 'Manage Sites',
            to: '/sites',
            roles: ['ADMIN']
        },
        {
            icon: BarChart3,
            label: 'Generation Logs',
            to: '/logs',
            roles: ['ADMIN', 'OPERATOR']
        },
        { icon: Settings, label: 'Settings', to: '/settings' },
    ].filter(item => !item.roles || item.roles.includes(user?.role));


    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transition-transform duration-200 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b flex items-center justify-center">
                        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                            <Sun className="text-yellow-500" size={32} />
                            Solar<span className="text-foreground">Meter</span>
                        </h1>
                    </div>

                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsOpen(false)} // Close on mobile click
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="p-4 border-t bg-muted/20 space-y-4">
                        {/* User Profile */}
                        <div className="flex items-center gap-3 px-4 py-2">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-lg">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-black truncate">{user?.username}</p>
                                <div className="flex items-center gap-1">
                                    <Shield size={10} className="text-primary" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{user?.role}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-4 py-2 bg-background/50 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Theme</span>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Sun size={18} className="text-orange-500" />}
                            </button>
                        </div>

                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-500/5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em]"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>

                </div>
            </aside>

            {/* Overlay for mobile */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />
        </>
    );
};

export default Sidebar;
