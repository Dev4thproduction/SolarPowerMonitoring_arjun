import React from 'react';
import { CalendarRange, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { MONTHS } from '../utils/constants';

/**
 * Monthly View Component
 * Displays monthly aggregated data - matrix for all sites, cards for single site
 */
const MonthlyView = ({
    selectedSite,
    aggregatedData
}) => {
    const dataLength = selectedSite === 'all'
        ? aggregatedData.allSites.monthly.length
        : aggregatedData.monthly.length;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{dataLength}</span> entries
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
                        const isExcellent = month.avgGeneration > 4000;
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
    );
};

export default MonthlyView;
