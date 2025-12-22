import React from 'react';
import { Plus, Target, Loader2 } from 'lucide-react';

/**
 * Quick Add Form Component
 * Allows quick entry of daily generation records
 */
const QuickAddForm = ({
    selectedSite,
    quickAddData,
    setQuickAddData,
    handleQuickAdd,
    quickAddMutation
}) => {
    if (selectedSite === 'all') {
        return (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-6 mb-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center">
                        <Target size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Select a Site</h3>
                        <p className="text-xs">Please select a specific site from the dropdown to add new daily records.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-6 mb-6">
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
    );
};

export default QuickAddForm;
