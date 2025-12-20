import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Save, Calendar, Target, Zap, Loader2, CheckCircle2, AlertCircle, Pencil, Trash2, X, Eye, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, BarChart3, Download, Upload, FileSpreadsheet, FileText, Plus } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS = [
    { key: 'apr', label: 'April', num: 3 }, { key: 'may', label: 'May', num: 4 }, { key: 'jun', label: 'June', num: 5 },
    { key: 'jul', label: 'July', num: 6 }, { key: 'aug', label: 'August', num: 7 }, { key: 'sep', label: 'September', num: 8 },
    { key: 'oct', label: 'October', num: 9 }, { key: 'nov', label: 'November', num: 10 }, { key: 'dec', label: 'December', num: 11 },
    { key: 'jan', label: 'January', num: 0 }, { key: 'feb', label: 'February', num: 1 }, { key: 'mar', label: 'March', num: 2 }
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DataLogs = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState('targets');
    const [statusMsg, setStatusMsg] = useState(null);

    // View Mode for Records Tab: 'daily', 'monthly', 'yearly'
    const [viewMode, setViewMode] = useState('daily');

    // Import State
    const [isImporting, setIsImporting] = useState(false);

    // Targets State
    const [targets, setTargets] = useState({});

    // Daily Log State
    const [dailyLog, setDailyLog] = useState({ date: new Date().toISOString().split('T')[0], dailyGeneration: '' });

    // View Logs State
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Quick Add State
    const [quickAddData, setQuickAddData] = useState({ date: new Date().toISOString().split('T')[0], generation: '' });

    // Fetch Sites
    const { data: sites = [] } = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    // Fetch Existing Targets for current Site/Year
    const { data: existingTargets } = useQuery({
        queryKey: ['build-generation', selectedSite, selectedYear],
        queryFn: () => api.get(`/build-generation/${selectedSite}?year=${selectedYear}`).then(res => res.data[0] || {}),
        enabled: !!selectedSite,
    });

    // Fetch Daily Logs for View Tab
    const { data: dailyLogs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['daily-generation', selectedSite],
        queryFn: () => api.get(`/daily-generation/${selectedSite}`).then(res => res.data),
        enabled: !!selectedSite && activeTab === 'view',
    });

    // Get current site name for exports
    const currentSiteName = useMemo(() => {
        const site = sites.find(s => s._id === selectedSite);
        return site ? site.siteName : 'Unknown Site';
    }, [sites, selectedSite]);

    // Aggregate data for Monthly and Yearly views
    const aggregatedData = useMemo(() => {
        if (!dailyLogs.length) return { monthly: [], yearly: [] };

        // Monthly aggregation
        const monthlyMap = {};
        dailyLogs.forEach(log => {
            const date = new Date(log.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = { year: date.getFullYear(), month: date.getMonth(), total: 0, count: 0, records: [] };
            }
            monthlyMap[key].total += log.dailyGeneration;
            monthlyMap[key].count += 1;
            monthlyMap[key].records.push(log);
        });

        const monthly = Object.entries(monthlyMap)
            .map(([key, val]) => ({
                key,
                year: val.year,
                month: val.month,
                monthName: MONTH_NAMES[val.month],
                totalGeneration: val.total,
                avgGeneration: val.total / val.count,
                daysRecorded: val.count
            }))
            .sort((a, b) => b.key.localeCompare(a.key));

        // Yearly aggregation
        const yearlyMap = {};
        dailyLogs.forEach(log => {
            const date = new Date(log.date);
            const year = date.getFullYear();
            if (!yearlyMap[year]) {
                yearlyMap[year] = { total: 0, count: 0 };
            }
            yearlyMap[year].total += log.dailyGeneration;
            yearlyMap[year].count += 1;
        });

        const yearly = Object.entries(yearlyMap)
            .map(([year, val]) => ({
                year: parseInt(year),
                totalGeneration: val.total,
                avgDailyGeneration: val.total / val.count,
                daysRecorded: val.count
            }))
            .sort((a, b) => b.year - a.year);

        return { monthly, yearly };
    }, [dailyLogs]);

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
        if (activeTab === 'view' && selectedSite) {
            refetchLogs();
        }
    }, [activeTab, selectedSite, refetchLogs]);

    const showStatus = (msg, type) => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 4000);
    };

    // === EXPORT FUNCTIONS ===
    const exportToXLSX = () => {
        const exportData = dailyLogs.map(log => ({
            Date: new Date(log.date).toLocaleDateString('en-US'),
            'Generation (kWh)': log.dailyGeneration,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Generation');

        // Add column widths
        ws['!cols'] = [{ wch: 15 }, { wch: 20 }];

        XLSX.writeFile(wb, `${currentSiteName}_DailyGeneration_${new Date().toISOString().split('T')[0]}.xlsx`);
        showStatus('Excel file downloaded successfully!', 'success');
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(59, 130, 246);
        doc.text('Solar Power Meter - Generation Report', 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Site: ${currentSiteName}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
        doc.text(`Total Records: ${dailyLogs.length}`, 14, 42);

        // Summary stats
        const totalGen = dailyLogs.reduce((acc, log) => acc + log.dailyGeneration, 0);
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.text(`Total Generation: ${totalGen.toLocaleString()} kWh`, 14, 52);

        // Table
        const tableData = dailyLogs.slice(0, 100).map(log => [
            new Date(log.date).toLocaleDateString('en-US'),
            log.dailyGeneration.toLocaleString() + ' kWh'
        ]);

        doc.autoTable({
            startY: 60,
            head: [['Date', 'Generation']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 }
        });

        doc.save(`${currentSiteName}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showStatus('PDF report downloaded successfully!', 'success');
    };

    // === IMPORT FUNCTION ===
    const handleFileImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            let successCount = 0;
            let errorCount = 0;

            for (const row of jsonData) {
                try {
                    // Try to find date and generation columns (flexible column names)
                    const dateVal = row['Date'] || row['date'] || row['DATE'] || Object.values(row)[0];
                    const genVal = row['Generation (kWh)'] || row['generation'] || row['Generation'] || row['kWh'] || row['Daily Generation'] || Object.values(row)[1];

                    if (dateVal && genVal) {
                        const parsedDate = new Date(dateVal);
                        const parsedGen = parseFloat(genVal);

                        if (!isNaN(parsedDate.getTime()) && !isNaN(parsedGen)) {
                            await api.post('/daily-generation', {
                                site: selectedSite,
                                date: parsedDate.toISOString().split('T')[0],
                                dailyGeneration: parsedGen
                            });
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    }
                } catch (rowErr) {
                    errorCount++;
                }
            }

            queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
            showStatus(`Import complete! ${successCount} records added, ${errorCount} failed.`, successCount > 0 ? 'success' : 'error');
        } catch (err) {
            showStatus('Failed to import file. Please check the format.', 'error');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
            showStatus('Record added successfully!', 'success');
            setQuickAddData({ date: new Date().toISOString().split('T')[0], generation: '' });
        },
        onError: () => showStatus('Failed to add record', 'error')
    });

    const handleTargetSubmit = (e) => {

        e.preventDefault();
        const payload = { site: selectedSite, year: selectedYear, ...targets };
        Object.keys(targets).forEach(k => payload[k] = parseFloat(targets[k]) || 0);
        targetMutation.mutate(payload);
    };

    const handleDailySubmit = (e) => {
        e.preventDefault();
        dailyMutation.mutate({ site: selectedSite, ...dailyLog, dailyGeneration: parseFloat(dailyLog.dailyGeneration) });
    };

    const startEdit = (record) => {
        setEditingId(record._id);
        setEditValue(record.dailyGeneration.toString());
    };

    const saveEdit = () => {
        updateMutation.mutate({ id: editingId, dailyGeneration: parseFloat(editValue) });
    };

    const handleQuickAdd = (e) => {
        e.preventDefault();
        quickAddMutation.mutate({
            site: selectedSite,
            date: quickAddData.date,
            dailyGeneration: parseFloat(quickAddData.generation)
        });
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);


    // Pagination for Daily View
    const totalPages = Math.ceil(dailyLogs.length / pageSize);
    const paginatedLogs = dailyLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-6">
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
                <div className="flex overflow-x-auto no-scrollbar border-b bg-muted/30">
                    <button
                        onClick={() => setActiveTab('targets')}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 sm:px-6 py-4 font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all whitespace-nowrap text-xs sm:text-base",
                            activeTab === 'targets' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Target size={18} /> <span className="hidden xs:inline">Monthly</span> Targets
                    </button>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 sm:px-6 py-4 font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all whitespace-nowrap text-xs sm:text-base",
                            activeTab === 'daily' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Zap size={18} /> <span className="hidden xs:inline">Daily</span> Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('view')}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 sm:px-6 py-4 font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all whitespace-nowrap text-xs sm:text-base",
                            activeTab === 'view' ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Eye size={18} /> <span className="hidden xs:inline">View</span> Records
                    </button>
                </div>

                <div className="p-4 sm:p-8">
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
                                    disabled={targetMutation.isPending}
                                    className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {targetMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Annual Targets
                                </button>
                            </div>
                        </form>
                    ) : activeTab === 'daily' ? (
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
                                disabled={dailyMutation.isPending}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg"
                            >
                                {dailyMutation.isPending ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                Log Generation
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {/* Import/Export Actions & View Mode Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* View Mode Selector */}
                                <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
                                    <button
                                        onClick={() => { setViewMode('daily'); setCurrentPage(1); }}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                            viewMode === 'daily' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <CalendarDays size={14} /> Daily
                                    </button>
                                    <button
                                        onClick={() => setViewMode('monthly')}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                            viewMode === 'monthly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <CalendarRange size={14} /> Monthly
                                    </button>
                                    <button
                                        onClick={() => setViewMode('yearly')}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                            viewMode === 'yearly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <BarChart3 size={14} /> Yearly
                                    </button>
                                </div>

                                {/* Import/Export Buttons */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileImport}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isImporting}
                                        className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-500/20 transition-colors"
                                    >
                                        {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Import XLSX
                                    </button>
                                    <button
                                        onClick={exportToXLSX}
                                        disabled={dailyLogs.length === 0}
                                        className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <FileSpreadsheet size={14} /> Export XLSX
                                    </button>
                                    <button
                                        onClick={exportToPDF}
                                        disabled={dailyLogs.length === 0}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <FileText size={14} /> Export PDF
                                    </button>
                                </div>
                            </div>

                            {/* Quick Add Record Form */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                        <Plus size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Add New Record</h3>
                                        <p className="text-xs text-muted-foreground">Manually enter daily generation data</p>
                                    </div>
                                </div>
                                <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-background border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                            value={quickAddData.date}
                                            onChange={e => setQuickAddData({ ...quickAddData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Generation (kWh)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            className="w-full bg-background border px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                            value={quickAddData.generation}
                                            onChange={e => setQuickAddData({ ...quickAddData, generation: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={quickAddMutation.isPending}
                                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                    >
                                        {quickAddMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        Add Record
                                    </button>
                                </form>
                            </div>

                            {isLogsLoading ? (

                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : dailyLogs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Zap size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No records found for this site.</p>
                                    <p className="text-xs mt-2">Use "Import XLSX" to bulk upload data or add records in "Daily Logs" tab.</p>
                                </div>
                            ) : (
                                <>
                                    {/* DAILY VIEW */}
                                    {viewMode === 'daily' && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">{dailyLogs.length}</span> daily records
                                                </p>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                                                            <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Generation (kWh)</th>
                                                            <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {paginatedLogs.map((log) => (
                                                            <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                                                                <td className="px-4 py-3 font-medium">
                                                                    {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    {editingId === log._id ? (
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-24 bg-background border px-2 py-1 rounded text-right focus:ring-2 focus:ring-primary outline-none"
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        <span className="font-bold text-green-500">{log.dailyGeneration.toLocaleString()}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {editingId === log._id ? (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button onClick={saveEdit} disabled={updateMutation.isPending} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors">
                                                                                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                                            </button>
                                                                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : deleteConfirmId === log._id ? (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button onClick={() => deleteMutation.mutate(log._id)} disabled={deleteMutation.isPending} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-xs font-bold">
                                                                                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                                                                            </button>
                                                                            <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button onClick={() => startEdit(log)} className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors" title="Edit">
                                                                                <Pencil size={16} />
                                                                            </button>
                                                                            <button onClick={() => setDeleteConfirmId(log._id)} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title="Delete">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between pt-4">
                                                    <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors">
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors">
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* MONTHLY VIEW */}
                                    {viewMode === 'monthly' && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">{aggregatedData.monthly.length}</span> months of data
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {aggregatedData.monthly.map((month) => (
                                                    <div key={month.key} className="bg-gradient-to-br from-muted/50 to-muted/20 border rounded-2xl p-5 hover:shadow-lg transition-all">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <p className="text-2xl font-black">{month.monthName}</p>
                                                                <p className="text-xs text-muted-foreground">{month.year}</p>
                                                            </div>
                                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                                <CalendarRange size={24} className="text-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">Total Generation</span>
                                                                <span className="font-bold text-green-500">{month.totalGeneration.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">Daily Average</span>
                                                                <span className="font-bold">{month.avgGeneration.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">Days Recorded</span>
                                                                <span className="font-bold text-blue-500">{month.daysRecorded}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* YEARLY VIEW */}
                                    {viewMode === 'yearly' && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">{aggregatedData.yearly.length}</span> years of data
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {aggregatedData.yearly.map((year) => (
                                                    <div key={year.year} className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-6 hover:shadow-xl transition-all">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div>
                                                                <p className="text-4xl font-black text-primary">{year.year}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">Annual Summary</p>
                                                            </div>
                                                            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                                                                <BarChart3 size={32} className="text-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="bg-background/50 rounded-xl p-4">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Generation</p>
                                                                <p className="text-3xl font-black text-green-500">{(year.totalGeneration / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-lg">MWh</span></p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-background/50 rounded-xl p-3">
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily Avg</p>
                                                                    <p className="text-lg font-bold">{year.avgDailyGeneration.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                                                                </div>
                                                                <div className="bg-background/50 rounded-xl p-3">
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Days Logged</p>
                                                                    <p className="text-lg font-bold text-blue-500">{year.daysRecorded}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )
                    }
                </div >
            </div >
        </div >
    );
};

export default DataLogs;
