import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

const Sites = () => {
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [formData, setFormData] = useState({ siteName: '', siteNumber: '', capacity: '' });
    const [statusMsg, setStatusMsg] = useState(null);

    // Fetch Sites
    const { data: sites = [], isLoading, error } = useQuery({
        queryKey: ['sites'],
        queryFn: () => api.get('/sites').then(res => res.data)
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (newSite) => api.post('/sites', newSite),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });
            showStatus('Site created successfully!', 'success');
            closeForm();
        },
        onError: (err) => showStatus(err.response?.data?.message || 'Failed to create site', 'error')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/sites/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });
            showStatus('Site updated successfully!', 'success');
            closeForm();
        },
        onError: (err) => showStatus(err.response?.data?.message || 'Failed to update site', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/sites/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sites'] });
            showStatus('Site deleted successfully!', 'success');
        },
        onError: (err) => showStatus(err.response?.data?.message || 'Failed to delete site', 'error')
    });

    const showStatus = (msg, type) => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleEdit = (site) => {
        setEditingSite(site);
        setFormData({ siteName: site.siteName, siteNumber: site.siteNumber, capacity: site.capacity });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingSite(null);
        setFormData({ siteName: '', siteNumber: '', capacity: '' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            siteNumber: parseInt(formData.siteNumber),
            capacity: parseFloat(formData.capacity)
        };
        if (editingSite) {
            updateMutation.mutate({ id: editingSite._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={48} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Sites</h1>
                    <p className="text-muted-foreground">Add or update solar plant installation details.</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all font-medium border border-primary/20 shadow-lg shadow-primary/10"
                >
                    <Plus size={20} /> Add New Site
                </button>
            </div>

            {statusMsg && (
                <div className={clsx(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                    statusMsg.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-destructive/10 border-destructive/20 text-destructive"
                )}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium text-sm sm:text-base">{statusMsg.msg}</span>
                </div>
            )}

            {/* Sites Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px] sm:min-w-0">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Name</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site No.</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capacity (kWp)</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sites.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-muted-foreground italic">No sites found. Add your first site to get started.</td>
                                </tr>
                            ) : (
                                sites.map((site) => (
                                    <tr key={site._id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 sm:px-6 py-4 font-medium text-sm sm:text-base">{site.siteName}</td>
                                        <td className="px-4 sm:px-6 py-4 text-muted-foreground text-sm sm:text-base">{site.siteNumber}</td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[10px] sm:text-sm font-bold border border-primary/20">
                                                {site.capacity} kWp
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(site)}
                                                className="p-1.5 sm:p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors border border-transparent hover:border-primary/20"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('Delete this site?')) deleteMutation.mutate(site._id) }}
                                                className="p-1.5 sm:p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
                            <h2 className="text-xl font-bold">{editingSite ? 'Edit Site' : 'Add New Site'}</h2>
                            <button onClick={closeForm} className="p-1 hover:bg-muted rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Site Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Solar Farm Alpha"
                                    className="w-full bg-background border px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                                    value={formData.siteName}
                                    onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Site Number</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="1001"
                                        className="w-full bg-background border px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                                        value={formData.siteNumber}
                                        onChange={e => setFormData({ ...formData, siteNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Capacity (kWp)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="500.5"
                                        className="w-full bg-background border px-4 py-2 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={createMutation.isLoading || updateMutation.isLoading}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all mt-4 flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {(createMutation.isLoading || updateMutation.isLoading) ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <CheckCircle2 size={20} />
                                )}
                                {editingSite ? 'Update Site' : 'Create Site'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sites;
