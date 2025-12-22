import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Save, Calendar, Target, Zap, Loader2, CheckCircle2, AlertCircle, Pencil, Trash2, X, Eye, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, BarChart3, Download, Upload, FileSpreadsheet, FileText, Plus, TrendingUp, TrendingDown, Sparkles, ChevronDown, ShieldCheck } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('view');
    const [statusMsg, setStatusMsg] = useState(null);

    // View Mode for Records Tab: 'daily', 'monthly', 'yearly'
    const [viewMode, setViewMode] = useState('view');
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

    // Monthly Entry State
    const [monthlyData, setMonthlyData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        totalGeneration: '',
        peakGeneration: '',
        avgDailyGeneration: '',
        daysOperational: '',
        notes: ''
    });

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportDropdownRef = useRef(null);

    // All Sites aggregate state
    const [allSitesAggregated, setAllSitesAggregated] = useState({ monthly: [], yearly: [] });



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

    // Fetch Monthly Generation for All Sites (New Source for Matrix)
    const { data: allMonthlyGenerations = [] } = useQuery({
        queryKey: ['monthly-generation', 'all'],
        queryFn: () => api.get('/monthly-generation/all-sites').then(res => res.data),
        enabled: selectedSite === 'all' && activeTab === 'view',
    });

    // Fetch Daily Logs for View Tab
    const { data: dailyLogs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['daily-generation', selectedSite],
        queryFn: () => {
            const url = selectedSite === 'all' ? '/daily-generation/all-sites' : `/daily-generation/${selectedSite}`;
            return api.get(url).then(res => res.data);
        },
        enabled: !!selectedSite && activeTab === 'view',
    });

    // Get current site name for exports
    const currentSiteName = useMemo(() => {
        const site = sites.find(s => s._id === selectedSite);
        return site ? site.siteName : 'Unknown Site';
    }, [sites, selectedSite]);

    // Aggregate data for Monthly and Yearly views
    const aggregatedData = useMemo(() => {
        if (!dailyLogs.length) return { monthly: [], yearly: [], allSites: { monthly: [], yearly: [] } };

        if (selectedSite === 'all') {
            // Group by Site -> Month
            const multiSiteMonthlyMap = {};
            const multiSiteYearlyMap = {};
            const siteLifetimeTotals = {};

            dailyLogs.forEach(log => {
                const date = new Date(log.date);
                const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const yr = date.getFullYear();
                const sId = log.site;

                if (!multiSiteMonthlyMap[sId]) multiSiteMonthlyMap[sId] = {};
                if (!multiSiteMonthlyMap[sId][mKey]) {
                    multiSiteMonthlyMap[sId][mKey] = { year: date.getFullYear(), month: date.getMonth(), total: 0, count: 0 };
                }
                multiSiteMonthlyMap[sId][mKey].total += log.dailyGeneration;
                multiSiteMonthlyMap[sId][mKey].count += 1;

                if (!multiSiteYearlyMap[sId]) multiSiteYearlyMap[sId] = {};
                if (!multiSiteYearlyMap[sId][yr]) {
                    multiSiteYearlyMap[sId][yr] = { total: 0, count: 0 };
                }
                multiSiteYearlyMap[sId][yr].total += log.dailyGeneration;
                multiSiteYearlyMap[sId][yr].count += 1;

                if (!siteLifetimeTotals[sId]) siteLifetimeTotals[sId] = 0;
                siteLifetimeTotals[sId] += log.dailyGeneration;
            });

            // Convert to flat arrays for table display
            const allSitesMonthly = Object.entries(multiSiteMonthlyMap).flatMap(([sId, months]) => {
                const site = sites.find(s => s._id === sId);
                return Object.entries(months).map(([mKey, val]) => ({
                    siteId: sId,
                    siteName: site?.siteName || 'Unknown',
                    siteNumber: site?.siteNumber || 'N/A',
                    key: mKey,
                    year: val.year,
                    month: val.month,
                    monthName: MONTH_NAMES[val.month],
                    totalGeneration: val.total,
                    avgGeneration: val.total / val.count
                }));
            }).sort((a, b) => b.key.localeCompare(a.key) || a.siteName.localeCompare(b.siteName));

            const allSitesYearly = Object.entries(multiSiteYearlyMap).flatMap(([sId, years]) => {
                const site = sites.find(s => s._id === sId);
                return Object.entries(years).map(([yr, val]) => ({
                    siteId: sId,
                    siteName: site?.siteName || 'Unknown',
                    siteNumber: site?.siteNumber || 'N/A',
                    year: parseInt(yr),
                    totalGeneration: val.total,
                    avgDailyGeneration: val.total / val.count
                }));
            }).sort((a, b) => b.year - a.year || a.siteName.localeCompare(b.siteName));

            const fleetSummary = sites.map(site => ({
                siteId: site._id,
                siteNumber: site.siteNumber,
                siteName: site.siteName,
                capacity: site.capacity,
                totalLifetimeGen: siteLifetimeTotals[site._id] || 0
            })).sort((a, b) => parseInt(a.siteNumber) - parseInt(b.siteNumber));

            // Matrix generation for the selected year
            // Matrix generation for the selected year
            const matrix = sites.map(site => {
                const row = {
                    siteId: site._id,
                    siteNumber: site.siteNumber,
                    siteName: site.siteName
                };
                let annualTotal = 0;

                MONTHS.forEach(m => {
                    // Financial Year Logic: Apr-Dec = selectedYear, Jan-Mar = selectedYear + 1
                    const yearOfDate = m.num < 3 ? selectedYear + 1 : selectedYear;
                    const mKey = `${yearOfDate}-${String(m.num + 1).padStart(2, '0')}`;
                    const monthIdx = m.num;

                    // Priority 1: Direct Monthly Record (from Import/Matrix)
                    const directRec = allMonthlyGenerations.find(r =>
                        String(r.site) === String(site._id) &&
                        r.year === yearOfDate &&
                        r.month === monthIdx
                    );

                    // Priority 2: Aggregated Daily Logs
                    const aggVal = multiSiteMonthlyMap[site._id]?.[mKey]?.total || 0;

                    // Use Direct Record if exists, else Aggregated
                    const val = directRec ? directRec.totalGeneration : aggVal;

                    row[m.key] = val;
                    annualTotal += val;
                });
                row.total = annualTotal;
                return row;
            }).sort((a, b) => parseInt(a.siteNumber) - parseInt(b.siteNumber));

            return { monthly: [], yearly: [], allSites: { monthly: allSitesMonthly, yearly: allSitesYearly, fleet: fleetSummary, matrix } };
        }

        // Single Site aggregation (Original logic)
        const monthlyMap = {};
        dailyLogs.forEach(log => {
            const date = new Date(log.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = { year: date.getFullYear(), month: date.getMonth(), total: 0, count: 0 };
            }
            monthlyMap[key].total += log.dailyGeneration;
            monthlyMap[key].count += 1;
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

        return { monthly, yearly, allSites: { monthly: [], yearly: [] } };
    }, [dailyLogs, sites, selectedSite, allMonthlyGenerations, selectedYear]);

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
    const currentSiteNumber = useMemo(() => {
        const site = sites.find(s => s._id === selectedSite);
        return site ? site.siteNumber : 'N/A';
    }, [sites, selectedSite]);

    // Click outside handler for export dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setIsExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const exportToXLSX = () => {
        const wb = XLSX.utils.book_new();

        if (viewMode === 'daily') {
            const dailyExportData = dailyLogs.map(log => {
                const row = {
                    'Date': new Date(log.date).toLocaleDateString('en-US'),
                    'Generation (kWh)': log.dailyGeneration,
                };

                // If All Sites, we need to map site ID to Site Number
                if (selectedSite === 'all') {
                    const siteObj = sites.find(s => s._id === log.site);
                    row['Site Number'] = siteObj ? siteObj.siteNumber : (log.siteNumber || 'N/A');
                    // Reorder columns to put Site Number first
                    return { 'Site Number': row['Site Number'], ...row };
                }
                return row;
            });

            const wsDailyData = XLSX.utils.json_to_sheet(dailyExportData);

            // Adjust column widths dynamically
            if (selectedSite === 'all') {
                wsDailyData['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 18 }];
            } else {
                wsDailyData['!cols'] = [{ wch: 15 }, { wch: 18 }];
            }
            XLSX.utils.book_append_sheet(wb, wsDailyData, 'Daily Generation');
            XLSX.writeFile(wb, `${currentSiteName}_Daily_${new Date().toISOString().split('T')[0]}.xlsx`);
            showStatus('Daily data exported to Excel!', 'success');

        } else if (viewMode === 'monthly') {
            if (selectedSite === 'all') {
                // Use the pre-calculated matrix from useMemo to ensure consistency with UI
                const matrixExportData = aggregatedData.allSites.matrix.map(row => {
                    const exportRow = {
                        'Site Number': row.siteNumber,
                        'Site Name': row.siteName,
                    };
                    // Add months in financial year order
                    MONTHS.forEach(m => {
                        exportRow[m.label] = row[m.key] > 0 ? row[m.key] : 0;
                    });
                    exportRow['Total (kWh)'] = row.total;
                    return exportRow;
                });

                const wsAllMonthly = XLSX.utils.json_to_sheet(matrixExportData);
                // Columns: #, Name, 12 Months, Total
                wsAllMonthly['!cols'] = [{ wch: 12 }, { wch: 25 }, ...Array(12).fill({ wch: 10 }), { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, wsAllMonthly, 'Portfolio Matrix');
                XLSX.writeFile(wb, `Portfolio_Matrix_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);

            } else {
                const currentSite = sites.find(s => s._id === selectedSite);
                const siteNumber = currentSite ? currentSite.siteNumber : 'N/A';

                const horizontalRow = { 'Site Number': siteNumber };
                const monthsOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
                monthsOrder.forEach(mIdx => {
                    const monthData = aggregatedData.monthly.find(m => m.month === mIdx);
                    horizontalRow[MONTH_NAMES[mIdx]] = monthData ? monthData.totalGeneration.toFixed(2) : 0;
                });

                const wsMonthlyData = XLSX.utils.json_to_sheet([horizontalRow]);
                wsMonthlyData['!cols'] = [{ wch: 12 }, ...Array(12).fill({ wch: 10 })];
                XLSX.utils.book_append_sheet(wb, wsMonthlyData, 'Monthly Summary');
                XLSX.writeFile(wb, `${currentSiteName}_Monthly_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
            showStatus('Monthly data exported to Excel!', 'success');
        } else if (viewMode === 'yearly') {
            if (selectedSite === 'all') {
                const multiSiteYearlyData = aggregatedData.allSites.yearly.map(row => ({
                    'Year': row.year,
                    'Site Number': row.siteNumber,
                    'Site Name': row.siteName,
                    'Annual Total (kWh)': row.totalGeneration.toFixed(2),
                    'Daily Avg (kWh)': row.avgDailyGeneration.toFixed(2)
                }));
                const wsAllYearly = XLSX.utils.json_to_sheet(multiSiteYearlyData);
                wsAllYearly['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, wsAllYearly, 'Portfolio Yearly');
                XLSX.writeFile(wb, `Portfolio_Yearly_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else {
                const yearlyExportData = aggregatedData.yearly.map((year, index) => ({
                    'S.No': index + 1,
                    'Site Number': currentSiteNumber,
                    'Site Name': currentSiteName,
                    'Year': year.year,
                    'Total Generation (kWh)': year.totalGeneration.toFixed(2),
                    'Avg Daily (kWh)': year.avgDailyGeneration.toFixed(2),
                    'Days Recorded': year.daysRecorded,
                }));
                const wsYearlyData = XLSX.utils.json_to_sheet(yearlyExportData);
                wsYearlyData['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 14 }];
                XLSX.utils.book_append_sheet(wb, wsYearlyData, 'Yearly Summary');
                XLSX.writeFile(wb, `${currentSiteName}_Yearly_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
            showStatus('Yearly data exported to Excel!', 'success');
        } else if (viewMode === 'fleet') {
            const fleetExportData = aggregatedData.allSites.fleet.map((site, index) => ({
                'S.No': index + 1,
                'Site Number': site.siteNumber,
                'Site Name': site.siteName,
                'Capacity (kWp)': site.capacity,
                'Lifetime Generation (kWh)': site.totalLifetimeGen
            }));
            const wsFleetData = XLSX.utils.json_to_sheet(fleetExportData);
            wsFleetData['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, wsFleetData, 'Fleet Master Record');
            XLSX.writeFile(wb, `Portfolio_Fleet_Overview_${new Date().toISOString().split('T')[0]}.xlsx`);
            showStatus('Fleet Master Record exported to Excel!', 'success');
        }
    };


    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(59, 130, 246);
        doc.text(`Solar Power Meter - ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Report`, 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Site: ${selectedSite === 'all' ? 'All Sites Portfolio' : currentSiteName + ' (Site #' + currentSiteNumber + ')'}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
        doc.text(`View Mode: ${viewMode.toUpperCase()}`, 14, 42);

        let columns = [];
        let data = [];
        let headFillColor = [59, 130, 246]; // Blue
        let columnStyles = {};

        if (viewMode === 'daily') {
            // Summary stats
            const totalGen = dailyLogs.reduce((acc, log) => acc + log.dailyGeneration, 0);
            doc.setFontSize(12);
            doc.setTextColor(59, 130, 246);
            doc.text(`Total Records: ${dailyLogs.length} | Total Generation: ${totalGen.toLocaleString()} kWh`, 14, 52);

            columns = ["Date", "Generation (kWh)"];
            data = dailyLogs.map(log => [
                new Date(log.date).toLocaleDateString(),
                log.dailyGeneration.toLocaleString() + ' kWh'
            ]);

            doc.autoTable({
                startY: 60,
                head: [columns],
                body: data,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 8 },
            });
            showStatus('Daily PDF report downloaded!', 'success');

        } else if (viewMode === 'monthly') {
            if (selectedSite === 'all') {
                // Switch to landscape for matrix
                const lDoc = new jsPDF('l', 'mm', 'a4');
                lDoc.setFontSize(18);
                lDoc.setTextColor(59, 130, 246);
                lDoc.text(`Solar Power Meter - Monthly Portfolio Matrix`, 14, 20);
                lDoc.setFontSize(11);
                lDoc.setTextColor(100);
                lDoc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

                const monthsOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // Apr to Mar
                columns = ["Site #", "Site Name", ...monthsOrder.map(mIdx => MONTH_NAMES[mIdx]), "Total"];

                const siteMatrix = {};
                aggregatedData.allSites.monthly.forEach(row => {
                    const sId = row.siteId;
                    if (!siteMatrix[sId]) {
                        siteMatrix[sId] = { number: row.siteNumber, name: row.siteName, months: {}, annual: 0 };
                        monthsOrder.forEach(mIdx => { siteMatrix[sId].months[mIdx] = 0; });
                    }
                    siteMatrix[sId].months[row.month] = row.totalGeneration;
                    siteMatrix[sId].annual += row.totalGeneration;
                });

                data = Object.values(siteMatrix).sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(site => [
                    site.number,
                    site.name,
                    ...monthsOrder.map(mIdx => site.months[mIdx].toLocaleString()),
                    site.annual.toLocaleString()
                ]);

                lDoc.autoTable({
                    startY: 40,
                    head: [columns],
                    body: data,
                    theme: 'striped',
                    headStyles: { fillColor: [34, 197, 94] },
                    styles: { fontSize: 6.5 },
                    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 35 } }
                });
                lDoc.save(`Portfolio_Monthly_Matrix_${new Date().toISOString().split('T')[0]}.pdf`);
                showStatus('Monthly Portfolio PDF downloaded!', 'success');
                return;
            } else {
                const currentSite = sites.find(s => s._id === selectedSite);
                const siteNumber = currentSite ? currentSite.siteNumber?.toString() : 'N/A';

                const monthsOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // Apr to Mar
                columns = ["Site Number", ...monthsOrder.map(mIdx => MONTH_NAMES[mIdx])];

                const rowData = [siteNumber];
                monthsOrder.forEach(mIdx => {
                    const monthData = aggregatedData.monthly.find(m => m.month === mIdx);
                    rowData.push(monthData ? monthData.totalGeneration.toLocaleString() : "0");
                });

                data = [rowData];
                headFillColor = [34, 197, 94]; // Green
                // Tighten columns for 13 columns total
                columnStyles = { 0: { cellWidth: 15 } };
                for (let i = 1; i <= 12; i++) columnStyles[i] = { cellWidth: 14 };
            }

            doc.autoTable({
                startY: 60,
                head: [columns],
                body: data,
                theme: 'striped',
                headStyles: { fillColor: headFillColor },
                styles: { fontSize: 7 },
                columnStyles: columnStyles
            });
            showStatus('Monthly PDF report downloaded!', 'success');

        } else if (viewMode === 'yearly') {
            if (selectedSite === 'all') {
                columns = ["Year", "Site #", "Site Name", "Annual Total (kWh)", "Daily Avg"];
                data = aggregatedData.allSites.yearly.map(row => [
                    row.year,
                    row.siteNumber,
                    row.siteName,
                    row.totalGeneration.toLocaleString(),
                    row.avgDailyGeneration.toFixed(0)
                ]);
                headFillColor = [168, 85, 247]; // Purple
                columnStyles = { 0: { cellWidth: 20 }, 1: { cellWidth: 20 }, 2: { cellWidth: 60 } };
            } else {
                columns = ["S.No", "Site Number", "Site Name", "Year", "Total Gen (kWh)", "Avg Daily (kWh)", "Days"];
                data = aggregatedData.yearly.map((year, index) => [
                    index + 1,
                    currentSiteNumber,
                    currentSiteName,
                    year.year,
                    year.totalGeneration.toLocaleString(),
                    year.avgDailyGeneration.toFixed(2),
                    year.daysRecorded
                ]);
                headFillColor = [168, 85, 247]; // Purple
                columnStyles = { 0: { cellWidth: 15 }, 1: { cellWidth: 18 } };
            }

            doc.autoTable({
                startY: 60,
                head: [columns],
                body: data,
                theme: 'striped',
                headStyles: { fillColor: headFillColor },
                styles: { fontSize: 8 },
                columnStyles: columnStyles
            });
            showStatus('Yearly PDF report downloaded!', 'success');
        } else if (viewMode === 'fleet') {
            columns = ["S.No", "Site #", "Site Name", "Capacity", "Lifetime Gen"];
            data = aggregatedData.allSites.fleet.map((site, index) => [
                index + 1,
                site.siteNumber,
                site.siteName,
                site.capacity + ' kWp',
                site.totalLifetimeGen.toLocaleString() + ' kWh'
            ]);
            headFillColor = [31, 41, 55]; // Dark Slate
            columnStyles = { 0: { cellWidth: 15 }, 1: { cellWidth: 20 }, 2: { cellWidth: 60 } };

            doc.autoTable({
                startY: 60,
                head: [columns],
                body: data,
                theme: 'striped',
                headStyles: { fillColor: headFillColor },
                styles: { fontSize: 8 },
                columnStyles: columnStyles
            });
            showStatus('Fleet Master Record PDF downloaded!', 'success');
            doc.save(`Portfolio_Fleet_Overview_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }

        const fileName = selectedSite === 'all' ? `Portfolio_${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}_Report` : `${currentSiteName}_${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}_Report`;
        doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };



    // === IMPORT FUNCTION (FAST BULK IMPORT) ===
    const handleFileImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Multi-Site Import Logic
            let skippedCount = 0; // Fix: Declare variable

            if (selectedSite === 'all') {
                const siteGroups = {};
                let processedSites = 0;
                let totalImported = 0;
                let siteColumnFound = false;
                let dataColumnsFound = false;
                let isMatrixFormat = false;

                // Diagnostics Check
                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    const keys = Object.keys(firstRow);
                    isMatrixFormat = keys.some(k => ['Apr', 'May', 'Jun', 'July', 'Aug'].includes(k));
                }

                if (isMatrixFormat) {
                    const startYear = parseInt(String(selectedYear).split('-')[0]);
                    const endYear = startYear + 1;

                    // Map Month Name to Index and Year
                    // Financial Year: Apr (3) to Mar (2)
                    const monthMap = {
                        'Apr': { idx: 3, year: startYear }, 'April': { idx: 3, year: startYear },
                        'May': { idx: 4, year: startYear },
                        'Jun': { idx: 5, year: startYear }, 'June': { idx: 5, year: startYear },
                        'Jul': { idx: 6, year: startYear }, 'July': { idx: 6, year: startYear },
                        'Aug': { idx: 7, year: startYear }, 'August': { idx: 7, year: startYear },
                        'Sep': { idx: 8, year: startYear }, 'September': { idx: 8, year: startYear },
                        'Oct': { idx: 9, year: startYear }, 'October': { idx: 9, year: startYear },
                        'Nov': { idx: 10, year: startYear }, 'November': { idx: 10, year: startYear },
                        'Dec': { idx: 11, year: startYear }, 'December': { idx: 11, year: startYear },
                        'Jan': { idx: 0, year: endYear }, 'January': { idx: 0, year: endYear },
                        'Feb': { idx: 1, year: endYear }, 'February': { idx: 1, year: endYear },
                        'Mar': { idx: 2, year: endYear }, 'March': { idx: 2, year: endYear }
                    };

                    for (const row of jsonData) {
                        const siteNumVal = row['Site Number'] || row['Site #'] || row['site_number'] || row['SiteNumber'];
                        const site = sites.find(s => s.siteNumber === String(siteNumVal) || s.siteNumber === Number(siteNumVal));

                        if (site) {
                            if (!siteGroups[site._id]) siteGroups[site._id] = [];

                            Object.keys(row).forEach(key => {
                                const map = monthMap[key];
                                if (map) {
                                    let genVal = parseFloat(row[key]);

                                    // Handle empty strings from defval as 0
                                    if (row[key] === "") genVal = 0;

                                    // Allow 0 to overwrite existing values
                                    if (!isNaN(genVal) && genVal >= 0) {
                                        siteGroups[site._id].push({
                                            year: map.year,
                                            month: map.idx,
                                            totalGeneration: genVal,
                                            notes: 'Imported from Portfolio Matrix'
                                        });
                                    }
                                }
                            });
                        }
                    }

                    if (Object.keys(siteGroups).length === 0) {
                        showStatus('No matching sites or valid monthly data found in Matrix.', 'error');
                        setIsImporting(false);
                        return;
                    }

                    // Reuse bulk import logic for Matrix
                    await Promise.all(Object.entries(siteGroups).map(async ([sId, months]) => {
                        const res = await api.post('/monthly-generation/bulk-sync', { site: sId, months });
                        totalImported += (res.data.total || 0);
                        processedSites++;
                    }));

                    queryClient.invalidateQueries({ queryKey: ['monthly-generation'] });
                    queryClient.invalidateQueries({ queryKey: ['aggregated-data'] });
                    showStatus(`⚡ Matrix Import: ${totalImported} monthly records updated across ${processedSites} sites!`, 'success');
                    setIsImporting(false);
                    return;
                }

                for (const row of jsonData) {
                    // Try to find Site Number
                    const siteNumVal = row['Site Number'] || row['Site #'] || row['site_number'] || row['SiteNumber'];
                    if (siteNumVal !== undefined) siteColumnFound = true;

                    // Match site number to site ID
                    const site = sites.find(s => s.siteNumber === String(siteNumVal) || s.siteNumber === Number(siteNumVal));

                    if (site) {
                        const dateVal = row['Date'] || row['date'] || row['DATE'];
                        const genVal = row['Generation (kWh)'] || row['generation'] || row['Generation'] || row['kWh'] || row['Daily Generation'];

                        if (dateVal || genVal) dataColumnsFound = true;

                        if (dateVal && genVal) {
                            const parsedDate = new Date(dateVal);
                            const parsedGen = parseFloat(genVal);

                            if (!isNaN(parsedDate.getTime()) && !isNaN(parsedGen)) {
                                if (!siteGroups[site._id]) siteGroups[site._id] = [];
                                siteGroups[site._id].push({
                                    date: parsedDate.toISOString().split('T')[0],
                                    dailyGeneration: parsedGen
                                });
                            } else { skippedCount++; }
                        } else { skippedCount++; }
                    } else { skippedCount++; }
                }

                if (Object.keys(siteGroups).length === 0) {
                    if (!siteColumnFound) {
                        showStatus('Column "Site Number" not found in Excel.', 'error');
                    } else if (!dataColumnsFound) {
                        showStatus('Found Sites but missing "Date" or "Generation" columns.', 'error');
                    } else {
                        showStatus('No matching Site Numbers found in database.', 'error');
                    }
                    return;
                }

                // Parallel Import Requests
                await Promise.all(Object.entries(siteGroups).map(async ([sId, recs]) => {
                    if (isMatrixFormat) {
                        // Send to Monthly Bulk Sync
                        const res = await api.post('/monthly-generation/bulk-sync', { site: sId, months: recs });
                        totalImported += (res.data.total || 0); // Assuming API returns total synced
                    } else {
                        // Send to Daily Bulk Import
                        const res = await api.post('/daily-generation/bulk-import', { site: sId, records: recs });
                        totalImported += (res.data.total || 0);
                    }
                    processedSites++;
                }));

                // Invalidate both potential queries to be safe and force active refetch
                await queryClient.invalidateQueries({ queryKey: ['monthly-generation'], refetchType: 'active' });
                await queryClient.invalidateQueries({ queryKey: ['daily-generation'], refetchType: 'active' });

                showStatus(`⚡ Portfolio Import: ${totalImported} records imported across ${processedSites} sites!`, 'success');

            } else {
                // Single Site Import Logic (Existing)
                const records = [];
                for (const row of jsonData) {
                    const dateVal = row['Date'] || row['date'] || row['DATE'] || Object.values(row)[0];
                    const genVal = row['Generation (kWh)'] || row['generation'] || row['Generation'] || row['kWh'] || row['Daily Generation'] || Object.values(row)[1];

                    if (dateVal && genVal) {
                        const parsedDate = new Date(dateVal);
                        const parsedGen = parseFloat(genVal);
                        if (!isNaN(parsedDate.getTime()) && !isNaN(parsedGen)) {
                            records.push({ date: parsedDate.toISOString().split('T')[0], dailyGeneration: parsedGen });
                        } else { skippedCount++; }
                    } else { skippedCount++; }
                }

                if (records.length === 0) {
                    showStatus('No valid records found in file.', 'error');
                    return;
                }

                const response = await api.post('/daily-generation/bulk-import', { site: selectedSite, records });
                queryClient.invalidateQueries({ queryKey: ['daily-generation'] });
                showStatus(`⚡ Fast Import: ${response.data.total} records processed! (${response.data.upserted} new)${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`, 'success');
            }

        } catch (err) {
            console.error('Import error:', err);
            showStatus('Failed to import file. Please check the format.', 'error');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        // If All Sites is selected, add Site Number column
        const headers = selectedSite === 'all'
            ? ['Site Number', 'Date', 'Generation (kWh)']
            : ['Date', 'Generation (kWh)'];

        const exampleRow = selectedSite === 'all'
            ? ['2001 (Example)', '2023-01-01', '120.5']
            : ['2023-01-01', '120.5'];

        const wsData = [
            headers,
            exampleRow
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = selectedSite === 'all'
            ? [{ wch: 15 }, { wch: 15 }, { wch: 20 }]
            : [{ wch: 15 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `Solar_Import_Template_${selectedSite === 'all' ? 'MultiSite' : 'Single'}.xlsx`);
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

    const startEdit = (record) => {
        setEditingId(record._id);
        setEditValue(record.dailyGeneration.toString());
    };

    const saveEdit = () => {
        updateMutation.mutate({ id: editingId, dailyGeneration: parseFloat(editValue) });
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

    // Sync aggregated records to MongoDB MonthlyGeneration collection (Bulk)
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

                                {/* PR Preview & Target Info */}
                                {dailyLog.dailyGeneration > 0 && dailyLog.date && (
                                    <div className="mt-4 p-4 bg-muted/50 rounded-2xl border border-dashed border-border/50 animate-in fade-in zoom-in-95 duration-300">
                                        {(() => {
                                            const entryDate = new Date(dailyLog.date);
                                            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                                            const monthKey = monthNames[entryDate.getMonth()];
                                            const monthlyTarget = targets[monthKey] || 0;
                                            const daysInMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0).getDate();
                                            const dailyTarget = monthlyTarget / daysInMonth;
                                            const pr = dailyTarget > 0 ? (parseFloat(dailyLog.dailyGeneration) / dailyTarget) * 100 : 0;

                                            // Status configuration
                                            const isExcellent = pr >= 90;
                                            const isGood = pr >= 80;

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Real-time PR Preview</span>
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                                                            isExcellent ? "bg-green-500/20 text-green-500" : isGood ? "bg-blue-500/20 text-blue-500" : "bg-orange-500/20 text-orange-500"
                                                        )}>
                                                            {isExcellent ? 'Excellent' : isGood ? 'Good' : 'Needs Attention'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-end gap-3">
                                                        <div className="flex-1">
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={clsx("h-full transition-all duration-500", isExcellent ? "bg-green-500" : isGood ? "bg-blue-500" : "bg-orange-500")}
                                                                    style={{ width: `${Math.min(pr, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="text-2xl font-black tabular-nums">{pr.toFixed(1)}%</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Daily Target</span>
                                                            <span className="font-bold text-sm tracking-tight">{dailyTarget.toFixed(1)} <span className="text-[10px] font-normal italic">kWh</span></span>
                                                        </div>
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Deviation</span>
                                                            <span className={clsx("font-bold text-sm tabular-nums", pr >= 100 ? "text-green-500" : "text-red-500")}>
                                                                {pr >= 100 ? '+' : '-'}{Math.abs(100 - pr).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
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
                    ) : activeTab === 'monthly' ? (
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
                                                peakGeneration: (match.avgGeneration * 1.5).toFixed(2), // Estimating peak if not available
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
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Month</label>
                                    <select
                                        className="w-full bg-background border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                                        value={monthlyData.month}
                                        onChange={e => setMonthlyData({ ...monthlyData, month: e.target.value })}
                                    >
                                        {MONTH_NAMES.map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
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
                    ) : activeTab === 'view' ? (
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
                                        <CalendarDays size={14} /> Daily Logs
                                    </button>
                                    <button
                                        onClick={() => setViewMode('monthly')}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                            viewMode === 'monthly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <CalendarRange size={14} /> Monthly Aggregates
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('yearly'); setCurrentPage(1); }}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                            viewMode === 'yearly' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <BarChart3 size={14} /> Yearly Summary
                                    </button>
                                    {selectedSite === 'all' && (
                                        <button
                                            onClick={() => { setViewMode('fleet'); setCurrentPage(1); }}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                                                viewMode === 'fleet' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <ShieldCheck size={14} /> Fleet Overview
                                        </button>
                                    )}
                                </div>

                                {/* Export & Submit Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileImport}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />

                                    {/* Import Actions */}
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

                                    {/* Export Dropdown (Restored) */}
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
                                                <div className="p-1 transition-all">
                                                    <button
                                                        onClick={() => { exportToXLSX(); setIsExportOpen(false); }}
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
                                                        onClick={() => { exportToPDF(); setIsExportOpen(false); }}
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




                            {/* Quick Add Record Form */}
                            {viewMode === 'daily' && (
                                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-6 mb-6">
                                    {selectedSite === 'all' ? (
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center">
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Select a Site</h3>
                                                <p className="text-xs">Please select a specific site from the dropdown to add new daily records.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            )}

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
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">
                                                        {selectedSite === 'all' ? aggregatedData.allSites.monthly.length : aggregatedData.monthly.length}
                                                    </span> entries
                                                </p>
                                            </div>

                                            {selectedSite === 'all' ? (
                                                <div className="overflow-x-auto rounded-xl border">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-muted/50">
                                                            <tr>
                                                                <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground w-16">Site #</th>
                                                                <th className="px-3 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground min-w-[150px]">Site Name</th>
                                                                {MONTHS.map(m => (
                                                                    <th key={m.key} className="px-2 py-3 text-right font-bold uppercase tracking-wider text-muted-foreground">{m.label.slice(0, 3)}</th>
                                                                ))}

                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {aggregatedData.allSites.matrix.map((row, i) => (
                                                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                                    <td className="px-3 py-3 font-medium text-muted-foreground">{row.siteNumber}</td>
                                                                    <td className="px-3 py-3 font-bold text-blue-600 truncate max-w-[150px]" title={row.siteName}>{row.siteName}</td>
                                                                    {MONTHS.map(m => (
                                                                        <td key={m.key} className="px-2 py-3 text-right font-medium">
                                                                            {row[m.key] > 0 ? row[m.key].toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}
                                                                        </td>
                                                                    ))}

                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {aggregatedData.monthly.map((month, index) => {
                                                        const prevMonth = aggregatedData.monthly[index + 1];
                                                        const trend = prevMonth ? ((month.totalGeneration - prevMonth.totalGeneration) / prevMonth.totalGeneration) * 100 : null;

                                                        // Performance Status (Mock logic based on avg gen or if we had targets here)
                                                        // Since we don't have monthly targets in some contexts, we'll use a relative baseline
                                                        const isExcellent = month.avgGeneration > 4000; // Example thresh
                                                        const isGood = month.avgGeneration > 2500;

                                                        return (
                                                            <div key={month.key} className="bg-gradient-to-br from-muted/50 to-muted/20 border rounded-2xl p-5 hover:shadow-lg transition-all relative overflow-hidden group">
                                                                {/* Performance Badge */}
                                                                <div className={clsx(
                                                                    "absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase rounded-bl-xl shadow-sm",
                                                                    isExcellent ? "bg-green-500 text-white" : isGood ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                                                                )}>
                                                                    {isExcellent ? 'Excellent' : isGood ? 'Good' : 'Average'}
                                                                </div>

                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div>
                                                                        <p className="text-2xl font-black">{month.monthName}</p>
                                                                        <p className="text-xs text-muted-foreground">{month.year}</p>
                                                                    </div>
                                                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                                        <CalendarRange size={24} className="text-primary" />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <div className="flex justify-between text-xs mb-1">
                                                                            <span className="text-muted-foreground font-bold uppercase tracking-wider">Total Generation</span>
                                                                            {trend !== null && (
                                                                                <span className={clsx("flex items-center gap-0.5 font-bold", trend >= 0 ? "text-green-500" : "text-red-500")}>
                                                                                    {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                                                    {Math.abs(trend).toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xl font-black text-green-500">{month.totalGeneration.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs">kWh</span></p>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Daily Avg</span>
                                                                            <span className="font-bold text-sm">{month.avgGeneration.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                                                                        </div>
                                                                        <div className="flex flex-col text-right">
                                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Days</span>
                                                                            <span className="font-bold text-sm text-blue-500">{month.daysRecorded}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* YEARLY VIEW */}
                                    {viewMode === 'yearly' && (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">
                                                        {selectedSite === 'all' ? aggregatedData.allSites.yearly.length : aggregatedData.yearly.length}
                                                    </span> entries
                                                </p>
                                            </div>

                                            {selectedSite === 'all' ? (
                                                <div className="overflow-x-auto rounded-xl border">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Year</th>
                                                                <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Site #</th>
                                                                <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Site Name</th>
                                                                <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Annual Total (kWh)</th>
                                                                <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Daily Avg (kWh)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {aggregatedData.allSites.yearly.map((row, i) => (
                                                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                                    <td className="px-4 py-3 font-black text-primary">{row.year}</td>
                                                                    <td className="px-4 py-3">{row.siteNumber}</td>
                                                                    <td className="px-4 py-3 font-semibold text-blue-500">{row.siteName}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-green-500">{row.totalGeneration.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-right">{row.avgDailyGeneration.toFixed(0)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
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
                                            )}
                                        </>
                                    )}
                                    {/* FLEET OVERVIEW */}
                                    {viewMode === 'fleet' && selectedSite === 'all' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing <span className="font-bold text-foreground">{aggregatedData.allSites.fleet.length}</span> Sites in Fleet
                                                </p>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">S.No</th>
                                                            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Site #</th>
                                                            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Site Name</th>
                                                            <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Capacity (kWp)</th>
                                                            <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Lifetime Generation (kWh)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {aggregatedData.allSites.fleet.map((site, i) => (
                                                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-muted-foreground">{i + 1}</td>
                                                                <td className="px-4 py-3 font-bold">{site.siteNumber}</td>
                                                                <td className="px-4 py-3 font-semibold text-blue-500">{site.siteName}</td>
                                                                <td className="px-4 py-3 text-right">{site.capacity} kWp</td>
                                                                <td className="px-4 py-3 text-right font-bold text-green-500">{site.totalLifetimeGen.toLocaleString()} kWh</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : null}
                </div >

            </div >
        </div >
    );
};

export default DataLogs;
