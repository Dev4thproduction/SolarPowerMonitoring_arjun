import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { MONTHS, MONTH_NAMES } from './constants';

/**
 * Export data to Excel file
 */
export const exportToXLSX = ({
    viewMode,
    selectedSite,
    sites,
    dailyLogs,
    aggregatedData,
    selectedYear,
    showStatus
}) => {
    const wb = XLSX.utils.book_new();

    const currentSite = sites.find(s => s._id === selectedSite);
    const currentSiteName = currentSite ? currentSite.siteName : 'Unknown Site';
    const currentSiteNumber = currentSite ? currentSite.siteNumber : 'N/A';

    if (viewMode === 'daily') {
        const dailyExportData = dailyLogs.map(log => {
            const row = {
                'Date': new Date(log.date).toLocaleDateString('en-US'),
                'Generation (kWh)': log.dailyGeneration,
            };

            if (selectedSite === 'all') {
                const siteObj = sites.find(s => s._id === log.site);
                row['Site Number'] = siteObj ? siteObj.siteNumber : (log.siteNumber || 'N/A');
                return { 'Site Number': row['Site Number'], ...row };
            }
            return row;
        });

        const wsDailyData = XLSX.utils.json_to_sheet(dailyExportData);
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
            const matrixExportData = aggregatedData.allSites.matrix.map(row => {
                const exportRow = {
                    'Site Number': row.siteNumber,
                    'Site Name': row.siteName,
                };
                MONTHS.forEach(m => {
                    exportRow[m.label] = row[m.key] > 0 ? row[m.key] : 0;
                });
                exportRow['Total (kWh)'] = row.total;
                return exportRow;
            });

            const wsAllMonthly = XLSX.utils.json_to_sheet(matrixExportData);
            wsAllMonthly['!cols'] = [{ wch: 12 }, { wch: 25 }, ...Array(12).fill({ wch: 10 }), { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsAllMonthly, 'Portfolio Matrix');
            XLSX.writeFile(wb, `Portfolio_Matrix_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            const horizontalRow = { 'Site Number': currentSiteNumber };
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

/**
 * Export data to PDF file
 */
export const exportToPDF = ({
    viewMode,
    selectedSite,
    sites,
    dailyLogs,
    aggregatedData,
    showStatus
}) => {
    const doc = new jsPDF();

    const currentSite = sites.find(s => s._id === selectedSite);
    const currentSiteName = currentSite ? currentSite.siteName : 'Unknown Site';
    const currentSiteNumber = currentSite ? currentSite.siteNumber : 'N/A';

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
    let headFillColor = [59, 130, 246];
    let columnStyles = {};

    if (viewMode === 'daily') {
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
            const lDoc = new jsPDF('l', 'mm', 'a4');
            lDoc.setFontSize(18);
            lDoc.setTextColor(59, 130, 246);
            lDoc.text(`Solar Power Meter - Monthly Portfolio Matrix`, 14, 20);
            lDoc.setFontSize(11);
            lDoc.setTextColor(100);
            lDoc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

            const monthsOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
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
            const monthsOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
            columns = ["Site Number", ...monthsOrder.map(mIdx => MONTH_NAMES[mIdx])];

            const rowData = [currentSiteNumber];
            monthsOrder.forEach(mIdx => {
                const monthData = aggregatedData.monthly.find(m => m.month === mIdx);
                rowData.push(monthData ? monthData.totalGeneration.toLocaleString() : "0");
            });

            data = [rowData];
            headFillColor = [34, 197, 94];
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
            headFillColor = [168, 85, 247];
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
            headFillColor = [168, 85, 247];
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
        headFillColor = [31, 41, 55];
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

    const fileName = selectedSite === 'all'
        ? `Portfolio_${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}_Report`
        : `${currentSiteName}_${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}_Report`;
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Download import template
 */
export const downloadTemplate = (selectedSite) => {
    const wb = XLSX.utils.book_new();
    const headers = selectedSite === 'all'
        ? ['Site Number', 'Date', 'Generation (kWh)']
        : ['Date', 'Generation (kWh)'];

    const exampleRow = selectedSite === 'all'
        ? ['2001 (Example)', '2023-01-01', '120.5']
        : ['2023-01-01', '120.5'];

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = selectedSite === 'all'
        ? [{ wch: 15 }, { wch: 15 }, { wch: 20 }]
        : [{ wch: 15 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Solar_Import_Template_${selectedSite === 'all' ? 'MultiSite' : 'Single'}.xlsx`);
};
