import React, { useState } from 'react';
import { Home, Sun, BarChart3, Settings, Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    const navItems = [
        { icon: Home, label: 'Dashboard', to: '/' },
        { icon: BarChart3, label: 'Data Logs', to: '/logs' }, // Changed Analytics to Logs to fit requirements better
        { icon: Settings, label: 'Settings', to: '/settings' },
    ];

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

                    <div className="p-4 border-t bg-muted/20">
                        <div className="flex items-center justify-between px-4 py-2 bg-background rounded-full border">
                            <span className="text-xs font-semibold text-muted-foreground">Mode</span>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-1 rounded-full hover:bg-muted transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Sun size={18} className="text-orange-500" />}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default Sidebar;
