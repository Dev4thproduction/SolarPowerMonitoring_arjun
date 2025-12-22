import React from 'react';
import { CalendarDays, CalendarRange, BarChart3, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

/**
 * View Mode Selector Component
 * Tab navigation for switching between Daily, Monthly, Yearly, and Fleet views
 */
const ViewModeSelector = ({
    viewMode,
    setViewMode,
    setCurrentPage,
    selectedSite
}) => {
    const handleViewChange = (mode) => {
        setViewMode(mode);
        setCurrentPage(1);
    };

    return (
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
            <button
                onClick={() => handleViewChange('daily')}
                className={clsx(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    viewMode === 'daily' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <CalendarDays size={14} /> Daily Logs
            </button>
            <button
                onClick={() => handleViewChange('monthly')}
                className={clsx(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    viewMode === 'monthly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <CalendarRange size={14} /> Monthly Aggregates
            </button>
            <button
                onClick={() => handleViewChange('yearly')}
                className={clsx(
                    "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    viewMode === 'yearly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <BarChart3 size={14} /> Yearly Summary
            </button>
            {selectedSite === 'all' && (
                <button
                    onClick={() => handleViewChange('fleet')}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                        viewMode === 'fleet' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <ShieldCheck size={14} /> Fleet Overview
                </button>
            )}
        </div>
    );
};

export default ViewModeSelector;
