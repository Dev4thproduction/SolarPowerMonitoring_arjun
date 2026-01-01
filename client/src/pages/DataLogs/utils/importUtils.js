import * as XLSX from 'xlsx';
import api from '../../../services/api';
import { MONTHS } from '../utils/constants';

/**
 * Parse date in various formats to a Date object
 * Supports: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, Excel serial numbers
 */
const parseFlexibleDate = (input) => {
    if (!input) return null;

    // Already a Date object
    if (input instanceof Date) {
        return isNaN(input.getTime()) ? null : input;
    }

    // Handle Excel serial number (number representing days since 1900)
    if (typeof input === 'number') {
        // Excel date serial number
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + input * 24 * 60 * 60 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }

    const str = String(input).trim();

    // Try DD-MM-YYYY format
    let match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }
    }

    // Try DD/MM/YYYY format
    match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }
    }

    // Try YYYY-MM-DD format (ISO)
    match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Fallback to standard Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return new Date(Date.UTC(
            parsed.getUTCFullYear(),
            parsed.getUTCMonth(),
            parsed.getUTCDate(),
            0, 0, 0, 0
        ));
    }

    return null;
};

/**
 * Format Date to DD-MM-YYYY string
 */
const formatDateDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Handle file import for both single-site and multi-site data
 * Supports daily logs and monthly matrix formats
 */
export const handleFileImport = async ({
    file,
    selectedSite,
    selectedYear,
    sites,
    queryClient,
    showStatus,
    setIsImporting
}) => {
    if (!file) return;

    setIsImporting(true);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        let skippedCount = 0;

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
                                if (row[key] === "") genVal = 0;

                                if (!isNaN(genVal) && genVal >= 0) {
                                    siteGroups[site._id].push({
                                        year: map.year,
                                        month: map.idx,
                                        totalGeneration: genVal,
                                        notes: 'Imported from Portfolio Matrix',
                                        status: 'draft'
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

            // Standard daily import format
            for (const row of jsonData) {
                const siteNumVal = row['Site Number'] || row['Site #'] || row['site_number'] || row['SiteNumber'];
                if (siteNumVal !== undefined) siteColumnFound = true;

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
                setIsImporting(false);
                return;
            }

            await Promise.all(Object.entries(siteGroups).map(async ([sId, recs]) => {
                const res = await api.post('/daily-generation/bulk-import', { site: sId, records: recs });
                totalImported += (res.data.total || 0);
                processedSites++;
            }));

            await queryClient.invalidateQueries({ queryKey: ['monthly-generation'], refetchType: 'active' });
            await queryClient.invalidateQueries({ queryKey: ['daily-generation'], refetchType: 'active' });

            showStatus(`⚡ Portfolio Import: ${totalImported} records imported across ${processedSites} sites!`, 'success');

        } else {
            // Single Site Import Logic
            const records = [];
            for (const row of jsonData) {
                const dateVal = row['Date'] || row['date'] || row['DATE'] || Object.values(row)[0];
                const genVal = row['Generation (kWh)'] || row['generation'] || row['Generation'] || row['kWh'] || row['Daily Generation'] || Object.values(row)[1];

                if (dateVal && genVal !== undefined && genVal !== '') {
                    const parsedDate = parseFlexibleDate(dateVal);
                    const parsedGen = parseFloat(genVal);

                    if (parsedDate && !isNaN(parsedGen)) {
                        // Use DD-MM-YYYY format for consistency
                        const formattedDate = formatDateDDMMYYYY(parsedDate);
                        records.push({ date: formattedDate, dailyGeneration: parsedGen, status: 'draft' });
                    } else {
                        console.warn('Skipping row - invalid date or generation:', dateVal, genVal);
                        skippedCount++;
                    }
                } else { skippedCount++; }
            }

            if (records.length === 0) {
                showStatus('No valid records found in file.', 'error');
                setIsImporting(false);
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
    }
};

export default handleFileImport;
