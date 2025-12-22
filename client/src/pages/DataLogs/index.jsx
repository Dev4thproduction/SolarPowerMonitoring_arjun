import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Save, Calendar, Target, Zap, Loader2, CheckCircle2, AlertCircle, Eye, CalendarRange, Download, Upload, FileSpreadsheet, FileText, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

// Local imports
import { MONTHS, MONTH_NAMES, PAGE_SIZE } from './utils/constants';
import { exportToXLSX, exportToPDF, downloadTemplate } from './utils/exportUtils';
import { handleFileImport } from './utils/importUtils';
import { useDataAggregation } from './hooks/useDataAggregation';
import {
    DailyLogsTable,
    MonthlyView,
    YearlyView,
    FleetOverview,
    QuickAddForm,
    ViewModeSelector
} from './components';

const DataLogs = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const exportDropdownRef = useRef(null);

    // Core State
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('view');
    const [statusMsg, setStatusMsg] = useState(null);
    const [viewMode, setViewMode] = useState('daily');
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);

    // Form States
    const [targets, setTargets] = useState({});
    const [dailyLog, setDailyLog] = useState({ date: new Date().toISOString().split('T')[0], dailyGeneration: '' });
    const [quickAddData, setQuickAddData] = useState({ date: new Date().toISOString().split('T')[0], generation: '' });
    const [monthlyData, setMonthlyData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        totalGeneration: '',
        peakGeneration: '',
        avgDailyGeneration: '',
        daysOperational: '',
        notes: ''
    });

    // Table States
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Queries
    const { data: sites = [] } = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    const { data: existingTargets } = useQuery({
        queryKey: ['build-generation', selectedSite, selectedYear],
        queryFn: () => api.get(`/build-generation/${selectedSite}?year=${selectedYear}`).then(res => res.data[0] || {}),
        enabled: !!selectedSite && selectedSite !== 'all',
    });

    const { data: allMonthlyGenerations = [] } = useQuery({
        queryKey: ['monthly-generation', 'all'],
        queryFn: () => api.get('/monthly-generation/all-sites').then(res => res.data),
        enabled: selectedSite === 'all' && activeTab === 'view',
    });

    const { data: dailyLogs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['daily-generation', selectedSite],
        queryFn: () => {
            const url = selectedSite === 'all' ? '/daily-generation/all-sites' : `/daily-generation/${selectedSite}`;
            return api.get(url).then(res => res.data);
        },
        enabled: !!selectedSite && activeTab === 'view',
    });

    // Computed Values
    const currentSiteName = useMemo(() => {
        const site = sites.find(s => s._id === selectedSite);
        return site ? site.siteName : 'Unknown Site';
    }, [sites, selectedSite]);

    const aggregatedData = useDataAggregation({
        dailyLogs,
        sites,
        selectedSite,
        allMonthlyGenerations,
        selectedYear
    });

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    const totalPages = Math.ceil(dailyLogs.length / PAGE_SIZE);
    const paginatedLogs = dailyLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Effects
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

    useEffect(() => {
        if (activeTab === 'view' && selectedSite) refetchLogs();
    }, [activeTab, selectedSite, refetchLogs]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setIsExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helpers
    const showStatus = (msg, type) => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 4000);
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

    const updateMutation = useMutation({
        mutationFn: ({ id, dailyGeneration }) => api.put(`/daily-generation/${id}`, { dailyGeneration }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
            showStatus('Record updated successfully!', 'success');
            setEditingId(null);
        },
        onError: () => showStatus('Failed to update record', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/daily-generation/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
            showStatus('Record deleted successfully!', 'success');
            setDeleteConfirmId(null);
        },
        onError: () => showStatus('Failed to delete record', 'error')
    });

    const quickAddMutation = useMutation({
        mutationFn: (data) => api.post('/daily-generation', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
            showStatus('Daily record added successfully!', 'success');
            setQuickAddData({ date: new Date().toISOString().split('T')[0], generation: '' });
        },
        onError: () => showStatus('Failed to add record', 'error')
    });

    const monthlyMutation = useMutation({
        mutationFn: (data) => api.post('/monthly-generation', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['monthly-generation'] });
            showStatus('Monthly data saved to MongoDB successfully!', 'success');
            setMonthlyData({
                ...monthlyData,
                totalGeneration: '',
                peakGeneration: '',
                avgDailyGeneration: '',
                daysOperational: '',
                notes: ''
            });
        },
        onError: () => showStatus('Failed to save monthly data', 'error')
    });

    // Handlers
    const handleTargetSubmit = (e) => {
        e.preventDefault();
        const payload = { site: selectedSite, year: selectedYear, ...targets };
        Object.keys(targets).forEach(k => payload[k] = parseFloat(targets[k]) || 0);
        targetMutation.mutate(payload);
    };

    const handleMonthlySubmit = (e) => {
        e.preventDefault();
        monthlyMutation.mutate({
            site: selectedSite,
            year: parseInt(monthlyData.year),
            month: parseInt(monthlyData.month),
            totalGeneration: parseFloat(monthlyData.totalGeneration) || 0,
            peakGeneration: parseFloat(monthlyData.peakGeneration) || 0,
            avgDailyGeneration: parseFloat(monthlyData.avgDailyGeneration) || 0,
            daysOperational: parseInt(monthlyData.daysOperational) || 0,
            notes: monthlyData.notes
        });
    };

    const handleDailySubmit = (e) => {
        e.preventDefault();
        dailyMutation.mutate({ site: selectedSite, ...dailyLog, dailyGeneration: parseFloat(dailyLog.dailyGeneration) });
    };

    const handleQuickAdd = (e) => {
        e.preventDefault();
        if (selectedSite === 'all') {
            showStatus('Please select a specific site to add records.', 'error');
            return;
        }
        quickAddMutation.mutate({
            site: selectedSite,
            date: quickAddData.date,
            dailyGeneration: parseFloat(quickAddData.generation)
        });
    };

    const startEdit = (record) => {
        setEditingId(record._id);
        setEditValue(record.dailyGeneration.toString());
    };

    const saveEdit = () => {
        updateMutation.mutate({ id: editingId, dailyGeneration: parseFloat(editValue) });
    };

    const syncToMonthly = async () => {
        if (aggregatedData.monthly.length === 0) {
            showStatus('No monthly data to sync', 'error');
            return;
        }

        setIsSyncing(true);
        try {
            const payload = {
                site: selectedSite,
                months: aggregatedData.monthly.map(m => ({
                    year: m.year,
                    month: m.month,
                    totalGeneration: m.totalGeneration,
                    avgDailyGeneration: m.avgGeneration,
                    daysOperational: m.daysRecorded
                }))
            };

            const response = await api.post('/monthly-generation/bulk-sync', payload);
            queryClient.invalidateQueries({ queryKey: ['monthly-generation'] });
            showStatus(`⚡ Bulk Submit: ${response.data.total} months submitted successfully!`, 'success');
        } catch (err) {
            console.error('Submit error:', err);
            showStatus('Failed to submit records to MongoDB', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Export handlers
    const handleExportXLSX = () => {
        exportToXLSX({
            viewMode,
            selectedSite,
            sites,
            dailyLogs,
            aggregatedData,
            selectedYear,
            showStatus
        });
    };

    const handleExportPDF = () => {
        exportToPDF({
            viewMode,
            selectedSite,
            sites,
            dailyLogs,
            aggregatedData,
            showStatus
        });
    };

    const onFileImport = async (e) => {
        const file = e.target.files[0];
        await handleFileImport({
            file,
            selectedSite,
            selectedYear,
            sites,
            queryClient,
            showStatus,
            setIsImporting
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Entry</h1>
                    <p className="text-muted-foreground">Manage production targets and daily generation logs.</p>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
                    <select
                        value={selectedSite}
                        onChange={e => setSelectedSite(e.target.value)}
                        className="flex-1 md:flex-none bg-card border px-3 sm:px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-xs sm:text-sm"
                    >
                        <option value="all">🌐 All Sites Portfolio</option>
                        {sites.map(s => <option key={s._id} value={s._id}>{s.siteName}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="flex-1 md:flex-none bg-card border px-3 sm:px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-xs sm:text-sm"
                    >
                        {years.map(y => <option key={y} value={y}>{y} - {y + 1}</option>)}
                    </select>
                </div>
            </div>

            {/* Status Message */}
            {statusMsg && (
                <div className={clsx(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                    statusMsg.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-destructive/10 border-destructive/20 text-destructive"
                )}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{statusMsg.msg}</span>
                </div>
            )}

            {/* Main Content Card */}
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                {/* Tabs */}
                <div className="flex overflow-x-auto no-scrollbar border-b bg-muted/30">
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 sm:px-6 py-4 font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all whitespace-nowrap text-xs sm:text-base",
                            activeTab === 'monthly' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <CalendarRange size={18} /> Monthly Entry
                    </button>
                    <button
                        onClick={() => setActiveTab('view')}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 sm:px-6 py-4 font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all whitespace-nowrap text-xs sm:text-base",
                            activeTab === 'view' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Eye size={18} /> View Records
                    </button>
                </div>

                <div className="p-4 sm:p-8">
                    {/* Monthly Entry Tab */}
                    {activeTab === 'monthly' && (
                        <form onSubmit={handleMonthlySubmit} className="max-w-2xl mx-auto space-y-6 py-4">
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <CalendarRange size={24} className="text-primary" />
                                        <h2 className="text-xl font-black">Monthly Data Entry</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Submit aggregated monthly generation data to MongoDB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const match = aggregatedData.monthly.find(m => m.year === parseInt(monthlyData.year) && m.month === parseInt(monthlyData.month));
                                        if (match) {
                                            setMonthlyData({
                                                ...monthlyData,
                                                totalGeneration: match.totalGeneration.toFixed(2),
                                                avgDailyGeneration: match.avgGeneration.toFixed(2),
                                                daysOperational: match.daysRecorded.toString(),
                                                peakGeneration: (match.avgGeneration * 1.5).toFixed(2),
                                            });
                                            showStatus('Form auto-filled from daily logs!', 'success');
                                        } else {
                                            showStatus('No daily logs found for this month.', 'error');
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/20 transition-all shadow-sm"
                                >
                                    <Sparkles size={14} /> Suggest from Logs
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Select Site</label>
                                    <select
                                        className="w-full bg-background border px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                        value={selectedSite}
                                        onChange={e => setSelectedSite(e.target.value)}
                                    >
                                        <option value="all">🌐 All Sites Portfolio</option>
                                        {sites.map(s => <option key={s._id} value={s._id}>{s.siteName} (#{s.siteNumber})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Year</label>
                                    <select
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.year}
                                        onChange={e => setMonthlyData({ ...monthlyData, year: e.target.value })}
                                    >
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Month</label>
                                    <select
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.month}
                                        onChange={e => setMonthlyData({ ...monthlyData, month: e.target.value })}
                                    >
                                        {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold flex items-center gap-2"><Zap size={16} /> Total Generation (kWh) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="Enter total monthly generation..."
                                    className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-lg font-medium"
                                    value={monthlyData.totalGeneration}
                                    onChange={e => setMonthlyData({ ...monthlyData, totalGeneration: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Peak Generation (kWh)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.peakGeneration}
                                        onChange={e => setMonthlyData({ ...monthlyData, peakGeneration: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Avg Daily (kWh)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.avgDailyGeneration}
                                        onChange={e => setMonthlyData({ ...monthlyData, avgDailyGeneration: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Days Operational</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="31"
                                        placeholder="0"
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.daysOperational}
                                        onChange={e => setMonthlyData({ ...monthlyData, daysOperational: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Notes (Optional)</label>
                                <textarea
                                    placeholder="Any additional notes..."
                                    rows={2}
                                    className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium resize-none"
                                    value={monthlyData.notes}
                                    onChange={e => setMonthlyData({ ...monthlyData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={monthlyMutation.isPending}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg"
                            >
                                {monthlyMutation.isPending ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                Save Monthly Data to MongoDB
                            </button>
                        </form>
                    )}

                    {/* View Records Tab */}
                    {activeTab === 'view' && (
                        <div className="space-y-6">
                            {/* Controls Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <ViewModeSelector
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    setCurrentPage={setCurrentPage}
                                    selectedSite={selectedSite}
                                />

                                {/* Export & Import Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={onFileImport}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />

                                    <div className="flex items-center gap-1 bg-blue-500/10 p-1 rounded-lg border border-blue-500/20">
                                        <button
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={isImporting}
                                            className="px-3 py-1.5 text-blue-600 rounded-md text-xs font-bold flex items-center gap-2 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                                            title={selectedSite === 'all' ? "Import Site Number mapped data" : "Upload Excel File"}
                                        >
                                            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Import
                                        </button>
                                    </div>

                                    <div className="relative" ref={exportDropdownRef}>
                                        <button
                                            onClick={() => setIsExportOpen(!isExportOpen)}
                                            disabled={dailyLogs.length === 0}
                                            className={clsx(
                                                "px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-green-500/20 transition-all disabled:opacity-50",
                                                isExportOpen && "ring-2 ring-green-500 shadow-lg"
                                            )}
                                        >
                                            <FileSpreadsheet size={14} />
                                            <span>Export {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</span>
                                            <ChevronDown size={14} className={clsx("transition-transform duration-300", isExportOpen && "rotate-180")} />
                                        </button>

                                        {isExportOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="p-1">
                                                    <button
                                                        onClick={() => { handleExportXLSX(); setIsExportOpen(false); }}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold hover:bg-green-500/10 text-green-600 rounded-lg transition-colors group text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-all">
                                                            <FileSpreadsheet size={16} />
                                                        </div>
                                                        <div>
                                                            <p>Excel Sheet</p>
                                                            <p className="text-[10px] text-muted-foreground font-normal">Site_{viewMode}_Data.xlsx</p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => { handleExportPDF(); setIsExportOpen(false); }}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold hover:bg-red-500/10 text-red-600 rounded-lg transition-colors group text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <p>PDF Report</p>
                                                            <p className="text-[10px] text-muted-foreground font-normal">Site_{viewMode}_Report.pdf</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={syncToMonthly}
                                        disabled={aggregatedData.monthly.length === 0 || isSyncing}
                                        className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Submit Records
                                    </button>
                                </div>
                            </div>

                            {/* Quick Add Form (Daily View Only) */}
                            {viewMode === 'daily' && (
                                <QuickAddForm
                                    selectedSite={selectedSite}
                                    quickAddData={quickAddData}
                                    setQuickAddData={setQuickAddData}
                                    handleQuickAdd={handleQuickAdd}
                                    quickAddMutation={quickAddMutation}
                                />
                            )}

                            {/* Content */}
                            {isLogsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : dailyLogs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                                    <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                                    <h3 className="font-bold text-foreground">Awaiting Performance Data</h3>
                                    <p className="text-sm max-w-xs mx-auto mt-2 italic">Set your monthly targets or add a daily log to initialize the analytics engine.</p>
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'daily' && (
                                        <DailyLogsTable
                                            paginatedLogs={paginatedLogs}
                                            totalLogs={dailyLogs.length}
                                            editingId={editingId}
                                            editValue={editValue}
                                            deleteConfirmId={deleteConfirmId}
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            setEditingId={setEditingId}
                                            setEditValue={setEditValue}
                                            setDeleteConfirmId={setDeleteConfirmId}
                                            setCurrentPage={setCurrentPage}
                                            startEdit={startEdit}
                                            saveEdit={saveEdit}
                                            updateMutation={updateMutation}
                                            deleteMutation={deleteMutation}
                                        />
                                    )}

                                    {viewMode === 'monthly' && (
                                        <MonthlyView
                                            selectedSite={selectedSite}
                                            aggregatedData={aggregatedData}
                                        />
                                    )}

                                    {viewMode === 'yearly' && (
                                        <YearlyView
                                            selectedSite={selectedSite}
                                            aggregatedData={aggregatedData}
                                        />
                                    )}

                                    {viewMode === 'fleet' && selectedSite === 'all' && (
                                        <FleetOverview aggregatedData={aggregatedData} />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataLogs;
