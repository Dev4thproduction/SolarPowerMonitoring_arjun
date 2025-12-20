import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ChevronDown, Calendar, MapPin, Search } from 'lucide-react';
import clsx from 'clsx';
import DateRangePicker from '../ui/DateRangePicker';

const DashboardControls = ({
    selectedSite, onSiteChange,
    selectedYear, onYearChange,
    dateRange, onDateRangeChange,
    viewMode, onViewModeChange
}) => {
    const { data: sites = [], isLoading } = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div className="flex flex-col lg:flex-row flex-wrap gap-4 bg-card p-4 rounded-2xl border shadow-lg shadow-primary/5">
            {/* Site Picker */}
            <div className="relative min-w-[220px] flex-1 lg:flex-none">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block flex items-center gap-1.5 ml-1">
                    <MapPin size={10} className="text-primary" />
                    Solar Installation
                </label>
                <div className="relative group">
                    <select
                        value={selectedSite || ''}
                        onChange={(e) => onSiteChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full appearance-none bg-muted/30 border border-muted-foreground/10 px-4 py-3 rounded-xl pr-10 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all font-medium cursor-pointer hover:bg-muted/50"
                    >
                        <option value="" disabled>-- Select Site --</option>
                        {sites.map(site => (
                            <option key={site._id} value={site._id}>
                                {site.siteName} ({site.capacity} kWp)
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" size={16} />
                </div>
            </div>

            <div className="h-px lg:h-12 lg:w-px bg-muted-foreground/10 self-center" />

            {/* View Mode & Time Pickers */}
            <div className="flex flex-col sm:flex-row items-end gap-4 flex-1">
                {/* Mode Toggle */}
                <div className="flex bg-muted/30 p-1 rounded-xl border border-muted-foreground/5 w-full sm:w-auto">
                    <button
                        onClick={() => onViewModeChange('year')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'year' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Calendar size={14} /> Fiscal Year
                    </button>
                    <button
                        onClick={() => onViewModeChange('range')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'range' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Calendar size={14} /> Custom Range
                    </button>
                </div>

                {viewMode === 'year' ? (
                    <div className="relative min-w-[140px] w-full sm:w-auto flex-1 sm:flex-none">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block flex items-center gap-1.5 ml-1">
                            Current Period
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedYear}
                                onChange={(e) => onYearChange(parseInt(e.target.value))}
                                className="w-full appearance-none bg-muted/30 border border-muted-foreground/10 px-4 py-3 rounded-xl pr-10 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all font-bold hover:bg-muted/50 cursor-pointer"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year} - {year + 1}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" size={16} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full sm:w-auto">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block flex items-center gap-1.5 ml-1">
                            Range Intelligence
                        </label>
                        <DateRangePicker
                            range={dateRange}
                            onChange={onDateRangeChange}
                            containerClassName="w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

DashboardControls.propTypes = {
    selectedSite: PropTypes.string,
    onSiteChange: PropTypes.func.isRequired,
    selectedYear: PropTypes.number.isRequired,
    onYearChange: PropTypes.func.isRequired,
    dateRange: PropTypes.object.isRequired,
    onDateRangeChange: PropTypes.func.isRequired,
    viewMode: PropTypes.string.isRequired,
    onViewModeChange: PropTypes.func.isRequired,
};

export default DashboardControls;
