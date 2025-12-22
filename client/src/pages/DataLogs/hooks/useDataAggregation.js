import { useMemo } from 'react';
import { MONTHS, MONTH_NAMES } from '../utils/constants';

/**
 * Custom hook to aggregate daily logs into monthly and yearly summaries
 * Handles both single-site and multi-site (portfolio) views
 */
export const useDataAggregation = ({
    dailyLogs,
    sites,
    selectedSite,
    allMonthlyGenerations,
    selectedYear
}) => {
    return useMemo(() => {
        if (!dailyLogs.length) {
            return {
                monthly: [],
                yearly: [],
                allSites: { monthly: [], yearly: [], fleet: [], matrix: [] }
            };
        }

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

            return {
                monthly: [],
                yearly: [],
                allSites: {
                    monthly: allSitesMonthly,
                    yearly: allSitesYearly,
                    fleet: fleetSummary,
                    matrix
                }
            };
        }

        // Single Site aggregation
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

        return {
            monthly,
            yearly,
            allSites: { monthly: [], yearly: [], fleet: [], matrix: [] }
        };
    }, [dailyLogs, sites, selectedSite, allMonthlyGenerations, selectedYear]);
};

export default useDataAggregation;
