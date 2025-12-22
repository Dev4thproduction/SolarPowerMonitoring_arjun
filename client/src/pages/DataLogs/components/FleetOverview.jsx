import React from 'react';

/**
 * Fleet Overview Component
 * Displays all sites with their capacity and lifetime generation
 */
const FleetOverview = ({ aggregatedData }) => {
    return (
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
    );
};

export default FleetOverview;
