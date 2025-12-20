import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Save, Calendar, Target, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const MONTHS = [
    { key: 'apr', label: 'April' }, { key: 'may', label: 'May' }, { key: 'jun', label: 'June' },
    { key: 'jul', label: 'July' }, { key: 'aug', label: 'August' }, { key: 'sep', label: 'September' },
    { key: 'oct', label: 'October' }, { key: 'nov', label: 'November' }, { key: 'dec', label: 'December' },
    { key: 'jan', label: 'January' }, { key: 'feb', label: 'February' }, { key: 'mar', label: 'March' }
];

const DataLogs = () => {
    const queryClient = useQueryClient();
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('targets');
    const [statusMsg, setStatusMsg] = useState(null);

    // Targets State
    const [targets, setTargets] = useState({});

    // Daily Log State
    const [dailyLog, setDailyLog] = useState({ date: new Date().toISOString().split('T')[0], dailyGeneration: '' });

    // Fetch Sites
    const { data: sites = [] } = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    // Fetch Existing Targets for current Site/Year
    const { data: existingTargets, isLoading: isTargetsLoading } = useQuery({
        queryKey: ['build-generation', selectedSite, selectedYear],
        queryFn: () => api.get(`/build-generation/${selectedSite}?year=${selectedYear}`).then(res => res.data[0] || {}),
        enabled: !!selectedSite,
    });

    useEffect(() => {
        if (existingTargets) {
            const newTargets = {};
            MONTHS.forEach(m => newTargets[m.key] = existingTargets[m.key] || '');
            setTargets(newTargets);
        }
    }, [existingTargets]);

    useEffect(() => {
        if (sites.length > 0 && !selectedSite) setSelectedSite(sites[0]._id);
    }, [sites, selectedSite]);

    const showStatus = (msg, type) => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    // Mutations
    const targetMutation = useMutation({
        mutationFn: (data) => api.post('/build-generation', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['build-generation'] });
            showStatus('Targets updated successfully!', 'success');
        },
        onError: () => showStatus('Failed to update targets', 'error')
    });

    const dailyMutation = useMutation({
        mutationFn: (data) => api.post('/daily-generation', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
            showStatus('Daily log saved successfully!', 'success');
            setDailyLog({ ...dailyLog, dailyGeneration: '' });
        },
        onError: () => showStatus('Failed to save daily log', 'error')
    });

    const handleTargetSubmit = (e) => {
        e.preventDefault();
        const payload = { site: selectedSite, year: selectedYear, ...targets };
        // Clean targets to numbers
        Object.keys(targets).forEach(k => payload[k] = parseFloat(targets[k]) || 0);
        targetMutation.mutate(payload);
    };

    const handleDailySubmit = (e) => {
        e.preventDefault();
        dailyMutation.mutate({ site: selectedSite, ...dailyLog, dailyGeneration: parseFloat(dailyLog.dailyGeneration) });
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Entry</h1>
                    <p className="text-muted-foreground">Manage production targets and daily generation logs.</p>
                </div>

                <div className="flex gap-4">
                    <select
                        value={selectedSite}
                        onChange={e => setSelectedSite(e.target.value)}
                        className="bg-card border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                        {sites.map(s => <option key={s._id} value={s._id}>{s.siteName}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="bg-card border px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                        {years.map(y => <option key={y} value={y}>{y} - {y + 1}</option>)}
                    </select>
                </div>
            </div>

            {statusMsg && (
                <div className={clsx(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                    statusMsg.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-destructive/10 border-destructive/20 text-destructive"
                )}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{statusMsg.msg}</span>
                </div>
            )}

            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex border-b bg-muted/30">
                    <button
                        onClick={() => setActiveTab('targets')}
                        className={clsx(
                            "px-6 py-4 font-semibold flex items-center gap-2 transition-all",
                            activeTab === 'targets' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Target size={18} /> Monthly Targets
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "px-6 py-4 font-semibold flex items-center gap-2 transition-all",
                            activeTab === 'daily' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Zap size={18} /> Daily Generation Logs
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'targets' ? (
                        <form onSubmit={handleTargetSubmit} className="space-y-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                                {MONTHS.map(m => (
                                    <div key={m.key} className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{m.label}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full bg-background border px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                                                value={targets[m.key] || ''}
                                                onChange={e => setTargets({ ...targets, [m.key]: e.target.value })}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kWh</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t flex justify-end">
                                <button
                                    type="submit"
                                    disabled={targetMutation.isLoading}
                                    className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {targetMutation.isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Annual Targets
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleDailySubmit} className="max-w-md mx-auto space-y-6 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold flex items-center gap-2"><Calendar size={16} /> Record Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-lg font-medium"
                                    value={dailyLog.date}
                                    onChange={e => setDailyLog({ ...dailyLog, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold flex items-center gap-2"><Zap size={16} /> Generation (kWh)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="Enter actual generation..."
                                    className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-lg font-medium"
                                    value={dailyLog.dailyGeneration}
                                    onChange={e => setDailyLog({ ...dailyLog, dailyGeneration: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={dailyMutation.isLoading}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg"
                            >
                                {dailyMutation.isLoading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                Log Generation
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataLogs;
