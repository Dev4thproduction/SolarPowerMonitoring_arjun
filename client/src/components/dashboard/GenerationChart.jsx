import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    ComposedChart, Bar, Line, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, Brush, Cell
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { LayoutDashboard, TrendingUp, Zap, Info, Filter } from 'lucide-react';
import clsx from 'clsx';

const GenerationChart = ({ data }) => {
    const { theme } = useTheme();
    const [view, setView] = useState('master'); // 'master', 'trend', 'efficiency'
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const axisStyle = {
        stroke: isDark ? '#475569' : '#cbd5e1',
        fontSize: 10,
        fontWeight: 600,
        tick: { fill: isDark ? '#94a3b8' : '#64748b' }
    };

    const tooltipStyle = {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'),
        borderRadius: '1rem',
        padding: '12px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Get data from the underlying data point (available on any payload item)
            const dataPoint = payload[0].payload;
            const actual = dataPoint.actual || 0;
            const target = dataPoint.target || 0;
            const pr = dataPoint.pr || 0;

            const diff = actual - target;
            const isPositive = diff >= 0;

            return (
                <div style={tooltipStyle} className="min-w-[180px]">
                    <p className="text-xs font-black uppercase tracking-tighter text-muted-foreground mb-2 border-b pb-1">{label}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">Target</span>
                            <span className="text-sm font-black">{target.toLocaleString()} <small className="text-[10px]">kWh</small></span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-green-500 uppercase">Actual</span>
                            <span className="text-sm font-black">{actual.toLocaleString()} <small className="text-[10px]">kWh</small></span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Gap</span>
                            <span className={clsx("text-xs font-black", isPositive ? "text-green-500" : "text-red-500")}>
                                {isPositive ? '+' : ''}{diff.toLocaleString()}
                            </span>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-2 flex flex-col items-center mt-2">
                            <span className="text-[9px] font-black uppercase text-primary mb-0.5">Performance Ratio</span>
                            <span className="text-xl font-black text-primary">{pr}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-card border-2 border-muted-foreground/10 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-700 hover:border-primary/20 group relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000" />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter">Production Intelligence</h3>
                    </div>
                    <p className="text-muted-foreground font-semibold flex items-center gap-2">
                        <Info size={14} className="text-primary" />
                        Interactive multi-layered analytical engine
                    </p>
                </div>

                <div className="flex bg-muted/30 p-1.5 rounded-[1.25rem] border border-muted-foreground/5 shadow-inner self-stretch md:self-auto overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setView('master')}
                        className={clsx(
                            "px-6 py-3 rounded-[0.9rem] text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                            view === 'master' ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-105" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutDashboard size={14} /> Executive View
                    </button>
                    <button
                        onClick={() => setView('trend')}
                        className={clsx(
                            "px-6 py-3 rounded-[0.9rem] text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                            view === 'trend' ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-105" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Zap size={14} /> Production Density
                    </button>
                    <button
                        onClick={() => setView('efficiency')}
                        className={clsx(
                            "px-6 py-3 rounded-[0.9rem] text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
                            view === 'efficiency' ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-105" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Filter size={14} /> Efficiency Index
                    </button>
                </div>
            </div>

            <div className="h-[450px] w-full bg-muted/5 rounded-[2rem] p-4 relative group/chart border border-muted-foreground/5">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <defs>
                            <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="actualColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                        <XAxis
                            dataKey="label"
                            {...axisStyle}
                            tickLine={false}
                            axisLine={false}
                            dy={15}
                        />
                        <YAxis
                            {...axisStyle}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
                        <Legend verticalAlign="top" height={60} iconType="circle" />

                        {/* Render different layers based on view */}
                        {(view === 'master' || view === 'trend') && (
                            <Bar
                                dataKey="target"
                                name="Planned Target"
                                fill={isDark ? "#1e293b" : "#f1f5f9"}
                                stroke={isDark ? "#334155" : "#e2e8f0"}
                                radius={[10, 10, 0, 0]}
                                maxBarSize={40}
                            />
                        )}

                        {view === 'trend' && (
                            <Area type="monotone" dataKey="actual" name="Production Flow" stroke="#22c55e" strokeWidth={4} fill="url(#actualColor)" />
                        )}

                        {view === 'master' && (
                            <Line
                                type="monotone"
                                dataKey="actual"
                                name="Live Production"
                                stroke="#22c55e"
                                strokeWidth={4}
                                dot={{ fill: '#22c55e', r: 4, strokeWidth: 4, stroke: isDark ? '#0f172a' : '#fff' }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
                            />
                        )}

                        {view === 'efficiency' && (
                            <>
                                <ReferenceLine y={100} stroke="#3b82f6" strokeDasharray="8 8" label={{ position: 'top', value: 'Goal (100%)', fill: '#3b82f6', fontSize: 10, fontWeight: 900 }} />
                                <Area
                                    type="stepAfter"
                                    dataKey="pr"
                                    name="Efficiency (%)"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fill="url(#areaColor)"
                                />
                            </>
                        )}

                        {/* Brush for deep history navigation - only appears if many data points */}
                        {data.length > 30 && (
                            <Brush
                                dataKey="label"
                                height={30}
                                stroke={isDark ? "#334155" : "#cbd5e1"}
                                fill={isDark ? "#1e293b" : "#f8fafc"}
                                travelerWidth={20}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-2xl border border-muted-foreground/10">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target Alignment Valid</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 px-4 py-2 rounded-2xl border border-muted-foreground/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Real-time Data Streaming</span>
                </div>
            </div>
        </div>
    );
};

GenerationChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default GenerationChart;
