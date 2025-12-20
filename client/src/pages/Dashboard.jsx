import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import SummaryCards from '../components/dashboard/SummaryCards';
import GenerationChart from '../components/dashboard/GenerationChart';
import DashboardControls from '../components/dashboard/DashboardControls';
import api from '../services/api';
import { Loader2, AlertCircle, RefreshCcw, CalendarClock } from 'lucide-react';

const Dashboard = () => {
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('year'); // 'year' or 'range'
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Fetch Sites
    const sitesResult = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    const sites = sitesResult.data || [];

    // Auto-select first site
    useEffect(() => {
        if (sites.length > 0 && !selectedSite) {
            setSelectedSite(sites[0]._id);
        }
    }, [sites, selectedSite]);

    // Fetch Dashboard Data
    const dashboardResult = useQuery({
        queryKey: ['dashboard', selectedSite, selectedYear, viewMode, dateRange],
        queryFn: () => {
            const params = { siteId: selectedSite };
            if (viewMode === 'year') {
                params.year = selectedYear;
            } else {
                params.startDate = dateRange.start;
                params.endDate = dateRange.end;
            }
            return api.get('/dashboard', { params }).then(res => res.data);
        },
        enabled: !!selectedSite
    });

    const { data, isLoading, error, refetch } = dashboardResult;

    if (isLoading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Analyzing solar performance...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-10 text-center max-w-2xl mx-auto mt-10 shadow-2xl shadow-destructive/5">
                <AlertCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-destructive mb-2">Service Interrupted</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                    {error.response?.data?.message || "We couldn't retrieve the performance metrics at this time."}
                </p>
                <button onClick={() => refetch()} className="inline-flex items-center gap-3 bg-destructive text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-destructive/20">
                    <RefreshCcw size={20} /> Reconnect
                </button>
            </div>
        );
    }

    const chartData = data?.data || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                        <CalendarClock className="text-primary" size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Solar Intelligence</h1>
                        <p className="text-muted-foreground font-medium">
                            {viewMode === 'year'
                                ? `Performance year ${selectedYear} - ${selectedYear + 1}`
                                : `Custom tracking: ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}`
                            }
                        </p>
                    </div>
                </div>
                <DashboardControls
                    selectedSite={selectedSite}
                    onSiteChange={setSelectedSite}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            </div>

            {!selectedSite ? (
                <div className="bg-card/50 border-2 border-dashed border-muted-foreground/20 rounded-3xl p-24 text-center max-w-4xl mx-auto">
                    <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="text-muted-foreground/40" size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Site Selected</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">Please select a solar installation from the dropdown menu to initialize monitoring.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {data && <SummaryCards data={chartData} />}
                    {data && <GenerationChart data={chartData} />}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
