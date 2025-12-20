import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { OctagonAlert, TriangleAlert, Info, CheckCircle2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const AlertsPanel = () => {
    const queryClient = useQueryClient();

    const { data: alerts, isLoading } = useQuery({
        queryKey: ['alerts'],
        queryFn: () => api.get('/alerts').then(res => res.data),
        refetchInterval: 10000 // Poll every 10 seconds for real-time feel
    });

    const resolveMutation = useMutation({
        mutationFn: (id) => api.patch(`/alerts/${id}/resolve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
    });

    if (isLoading) return <Loader2 className="animate-spin text-muted-foreground mx-auto" />;

    if (!alerts || alerts.length === 0) {
        return (
            <div className="bg-muted/10 border border-dashed rounded-2xl p-6 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">System Health: Optimal</p>
                <p className="text-[10px] text-muted-foreground mt-1">No active performance alerts detected.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[500px] xl:max-h-[400px] overflow-y-auto pr-2 no-scrollbar pb-10 xl:pb-0">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                <OctagonAlert size={12} className="text-red-500" /> Active System Alerts
            </h4>

            {alerts.map((alert) => (
                <div
                    key={alert._id}
                    className={clsx(
                        "group relative border-l-4 p-4 rounded-xl transition-all hover:translate-x-1 shadow-sm",
                        alert.severity === 'CRITICAL' ? "bg-red-500/5 border-red-500" :
                            alert.severity === 'WARNING' ? "bg-amber-500/5 border-amber-500" :
                                "bg-blue-500/5 border-blue-500"
                    )}
                >
                    <div className="flex gap-4">
                        <div className={clsx(
                            "mt-1",
                            alert.severity === 'CRITICAL' ? "text-red-500" :
                                alert.severity === 'WARNING' ? "text-amber-500" :
                                    "text-blue-500"
                        )}>
                            {alert.severity === 'CRITICAL' ? <OctagonAlert size={18} /> :
                                alert.severity === 'WARNING' ? <TriangleAlert size={18} /> :
                                    <Info size={18} />}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">
                                    {alert.site?.siteName || 'System'}
                                </span>
                                <span className="text-[9px] font-medium opacity-40">
                                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed mt-1">{alert.message}</p>

                            <button
                                onClick={() => resolveMutation.mutate(alert._id)}
                                className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <CheckCircle2 size={12} /> Mark as Resolved
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlertsPanel;
