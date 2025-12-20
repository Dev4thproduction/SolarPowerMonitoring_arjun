import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

import DashboardControls from '../components/dashboard/DashboardControls';
import SummaryCards from '../components/dashboard/SummaryCards';
import GenerationChart from '../components/dashboard/GenerationChart';
import { Loader2, AlertCircle } from 'lucide-react';

const Dashboard = () => {
    // State for filters
    const [selectedSite, setSelectedSite] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Auto-select first site if none selected
    const { data: sites } = useQuery({ queryKey: 'sites', staleTime: Infinity });

    useEffect(() => {
        if (!selectedSite && sites?.length > 0) {
            setSelectedSite(sites[0]._id);
        }
    }, [sites, selectedSite]);


    // Fetch Dashboard Data
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard', selectedSite, selectedYear],
        queryFn: async () => {
            if (!selectedSite) return null;
            const res = await api.get(`/dashboard?siteId=${selectedSite}&year=${selectedYear}`);
            return res.data;
        },
        enabled: !!selectedSite, // Only run if site is selected
    });

    if (isLoading && !data) {
        return (
            <div className="h-full flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-destructive/10 text-destructive p-6 rounded-xl flex items-center gap-3">
                <AlertCircle size={24} />
                <div>
                    <h3 className="font-semibold">Error Loading Data</h3>
                    <p className="text-sm">{error?.response?.data?.message || error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-muted-foreground">Monitor solar generation performance.</p>
                </div>

                <DashboardControls
                    selectedSite={selectedSite}
                    onSiteChange={setSelectedSite}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                />
            </div>

            {data?.data ? (
                <>
                    <SummaryCards data={data.data} />
                    <GenerationChart data={data.data} />
                </>
            ) : (
                <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-dashed">
                    <p>Select a site to view performance data.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
