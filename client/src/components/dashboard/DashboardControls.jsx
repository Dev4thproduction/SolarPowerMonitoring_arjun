import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ChevronDown, Calendar, MapPin } from 'lucide-react';

const DashboardControls = ({ selectedSite, onSiteChange, selectedYear, onYearChange }) => {
    // Fetch Sites
    const { data: sites = [], isLoading } = useQuery({
        queryKey: ['sites'],
        queryFn: async () => {
            const res = await api.get('/sites');
            return res.data;
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Generate Year Options (Current year +/- 2 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
            {/* Site Selector */}
            <div className="relative min-w-[200px]">
                <label className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1">
                    <MapPin size={12} />
                    Select Site
                </label>
                <div className="relative">
                    <select
                        value={selectedSite || ''}
                        onChange={(e) => onSiteChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full appearance-none bg-background border px-4 py-2.5 rounded-lg pr-10 focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                        <option value="" disabled>-- Select a Site --</option>
                        {sites.map(site => (
                            <option key={site._id} value={site._id}>
                                {site.siteName} (Cap: {site.capacity} kWp)
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                </div>
            </div>

            {/* Year Selector */}
            <div className="relative min-w-[120px]">
                <label className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1">
                    <Calendar size={12} />
                    Fiscal Year
                </label>
                <div className="relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => onYearChange(parseInt(e.target.value))}
                        className="w-full appearance-none bg-background border px-4 py-2.5 rounded-lg pr-10 focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year} - {year + 1}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                </div>
            </div>
        </div>
    );
};

import PropTypes from 'prop-types';

DashboardControls.propTypes = {
    selectedSite: PropTypes.string,
    onSiteChange: PropTypes.func.isRequired,
    selectedYear: PropTypes.number.isRequired,
    onYearChange: PropTypes.func.isRequired,
};

export default DashboardControls;
