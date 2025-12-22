import React from 'react';
import { Loader2, Pencil, Trash2, X, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Daily Logs Table Component
 * Displays paginated daily generation records with edit/delete capabilities
 */
const DailyLogsTable = ({
    paginatedLogs,
    totalLogs,
    editingId,
    editValue,
    deleteConfirmId,
    currentPage,
    totalPages,
    setEditingId,
    setEditValue,
    setDeleteConfirmId,
    setCurrentPage,
    startEdit,
    saveEdit,
    updateMutation,
    deleteMutation
}) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{totalLogs}</span> daily records
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
    );
};

export default DailyLogsTable;
