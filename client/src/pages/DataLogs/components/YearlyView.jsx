import React from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * Yearly View Component
 * Displays yearly aggregated data - table for all sites, cards for single site
 */
const YearlyView = ({
    selectedSite,
    aggregatedData
}) => {
    const dataLength = selectedSite === 'all'
        ? aggregatedData.allSites.yearly.length
        : aggregatedData.yearly.length;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{dataLength}</span> entries
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
    );
};

export default YearlyView;
