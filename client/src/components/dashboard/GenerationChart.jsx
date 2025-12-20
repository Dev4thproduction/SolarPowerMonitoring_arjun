import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    ComposedChart, Bar, Line, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, Brush, Cell
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { LayoutDashboard, TrendingUp, Zap, Info, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const GenerationChart = ({ data, forecast = [] }) => {
    const { theme } = useTheme();
    const [view, setView] = useState('master');
    const [isMounted, setIsMounted] = useState(false);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        setIsMounted(true);

        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                // Use requestAnimationFrame to let the browser finish layout
                requestAnimationFrame(() => {
                    setContainerDimensions({ width, height });
                });
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const activeData = view === 'forecast' ? forecast : data;

    // Loading skeleton that matches the exact chart geometry
    if (!isMounted || containerDimensions.width === 0) {
        return (
            <div
                ref={containerRef}
                className="h-[350px] md:h-[450px] xl:h-[500px] w-full bg-card border-2 border-muted-foreground/10 rounded-[2.5rem] p-8 shadow-2xl relative"
            >
                <div className="absolute inset-0 bg-muted/5 animate-pulse rounded-[2.5rem]" />
                <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Calibrating Geometry...</span>
                </div>
            </div>
        );
    }

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

            // Calculate PR dynamically for accuracy
            const calculatedPR = target > 0 ? (actual / target) * 100 : 0;

            // Use backend PR if available, otherwise use calculated
            const pr = dataPoint.pr || calculatedPR;

            const diff = actual - target;
            const isPositive = diff >= 0;

            // Determine PR status
            let prStatus = 'Poor';
            let prColor = 'text-red-500';
            if (pr >= 100) { prStatus = 'Over Target'; prColor = 'text-green-500'; }
            else if (pr >= 90) { prStatus = 'Excellent'; prColor = 'text-green-500'; }
            else if (pr >= 80) { prStatus = 'Good'; prColor = 'text-yellow-500'; }

            return (
                <div style={tooltipStyle} className="min-w-[200px]">
                    <p className="text-xs font-black uppercase tracking-tighter text-muted-foreground mb-3 border-b pb-2">{label}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">Target</span>
                            <span className="text-sm font-black">{target.toLocaleString(undefined, { maximumFractionDigits: 2 })} <small className="text-[10px]">kWh</small></span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-green-500 uppercase">Actual</span>
                            <span className="text-sm font-black">{actual.toLocaleString(undefined, { maximumFractionDigits: 2 })} <small className="text-[10px]">kWh</small></span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Gap</span>
                            <span className={clsx("text-xs font-black", isPositive ? "text-green-500" : "text-red-500")}>
                                {isPositive ? '+' : ''}{diff.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Performance Ratio Box */}
                        <div className="bg-purple-500/10 rounded-lg p-3 flex flex-col items-center mt-3 border border-purple-500/20">
                            <span className="text-[9px] font-black uppercase text-purple-500 mb-1">Performance Ratio (PR)</span>
                            <span className="text-2xl font-black text-purple-500 tracking-tighter">{pr.toFixed(2)}%</span>
                            <span className={clsx("text-[9px] font-black uppercase mt-1", prColor)}>{prStatus}</span>
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

                <div className="flex flex-col gap-6 w-full lg:w-auto mt-4 lg:mt-0">
                    {/* Playful Scrollable Tab Navigation */}
                    <div className="relative group/tabs">
                        {/* Left fade indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-20 pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity lg:hidden" />
                        {/* Right fade indicator */}
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-20 pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity lg:hidden" />

                        <div className="flex bg-gradient-to-br from-muted/40 to-muted/20 p-2 rounded-2xl border border-muted-foreground/10 shadow-lg backdrop-blur-sm overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
                            {[
                                { id: 'master', label: 'Executive', icon: LayoutDashboard, gradient: 'from-blue-600 to-blue-400', shadow: 'shadow-blue-500/40' },
                                { id: 'trend', label: 'Density', icon: Zap, gradient: 'from-green-600 to-green-400', shadow: 'shadow-green-500/40' },
                                { id: 'efficiency', label: 'Efficiency', icon: Filter, gradient: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/40' },
                                { id: 'forecast', label: 'Forecast', icon: TrendingUp, gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/40' }
                            ].map((btn) => (
                                <motion.button
                                    key={btn.id}
                                    onClick={() => setView(btn.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={clsx(
                                        "relative px-5 py-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 whitespace-nowrap snap-start min-w-fit",
                                        view === btn.id
                                            ? `bg-gradient-to-br ${btn.gradient} text-white shadow-xl ${btn.shadow}`
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <btn.icon size={16} className={view === btn.id ? "drop-shadow-lg" : ""} />
                                    <span className="hidden sm:inline">{btn.label}</span>
                                    {view === btn.id && (
                                        <motion.div
                                            layoutId="tabGlow"
                                            className="absolute inset-0 rounded-xl bg-white/20 -z-10"
                                            initial={false}
                                            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Custom External Legend - Shows all metrics */}
                    <div className="flex flex-wrap items-center justify-start lg:justify-end gap-4 lg:gap-6 px-4">
                        {(view === 'master' || view === 'trend') && (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Actual</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">PR %</span>
                                </div>
                            </>
                        )}
                        {view === 'efficiency' && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Efficiency Index</span>
                            </div>
                        )}
                        {view === 'forecast' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-500/50 border border-slate-400" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Planned</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Predicted</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Area - Hardened with ResizeObserver tracking */}
            <div
                ref={containerRef}
                key={view}
                className="relative h-[350px] md:h-[450px] xl:h-[500px] w-full bg-muted/5 rounded-[2.5rem] p-4 group/chart border border-muted-foreground/5 shadow-inner overflow-hidden flex flex-col"
            >
                {containerDimensions.width > 0 && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={0}>
                        <ComposedChart data={activeData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} />
                            <XAxis
                                dataKey="label"
                                {...axisStyle}
                                tickLine={false}
                                axisLine={false}
                                dy={15}
                            />
                            <YAxis
                                yAxisId="left"
                                key={view}
                                {...axisStyle}
                                domain={view === 'efficiency' ? [0, 120] : [0, 'auto']}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    if (view === 'efficiency') return `${val}%`;
                                    return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val;
                                }}
                            />
                            {/* Secondary Y-Axis for PR % */}
                            {(view === 'master' || view === 'trend') && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    {...axisStyle}
                                    domain={[0, 120]}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val}%`}
                                />
                            )}
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }} />
                            {/* Legend Removed from here to avoid overlap */}

                            {/* Render different layers based on view */}
                            {(view === 'master' || view === 'trend') && (
                                <>
                                    {/* Target Bars */}
                                    <Bar
                                        yAxisId="left"
                                        dataKey="target"
                                        name="Planned Target"
                                        fill={isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
                                        stroke={isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}
                                        radius={[8, 8, 0, 0]}
                                        maxBarSize={35}
                                    />
                                    {/* Target Line for clarity */}
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="target"
                                        name="Target Goal"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="8 4"
                                        dot={false}
                                        style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))' }}
                                    />
                                    {/* PR Line on secondary axis */}
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="pr"
                                        name="Performance Ratio"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }}
                                        activeDot={{ r: 6, fill: '#8b5cf6' }}
                                        style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))' }}
                                    />
                                </>
                            )}

                            {view === 'trend' && (
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="actual"
                                    name="Production Flow"
                                    stroke="#22c55e"
                                    strokeWidth={4}
                                    fill="url(#actualColor)"
                                    style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.4))' }}
                                />
                            )}

                            {view === 'master' && (
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="actual"
                                    name="Live Production"
                                    stroke="#22c55e"
                                    strokeWidth={4}
                                    dot={{ fill: '#22c55e', r: 4, strokeWidth: 3, stroke: isDark ? '#0f172a' : '#fff' }}
                                    activeDot={{ r: 7, strokeWidth: 0 }}
                                    style={{ filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))' }}
                                />
                            )}

                            {view === 'efficiency' && (
                                <>
                                    <ReferenceLine yAxisId="left" y={100} stroke="#ef4444" strokeDasharray="8 8" label={{ position: 'top', value: 'GOAL (100%)', fill: '#ef4444', fontSize: 10, fontWeight: 900 }} opacity={0.5} />
                                    <Area
                                        yAxisId="left"
                                        type="stepAfter"
                                        dataKey="pr"
                                        name="Efficiency Index"
                                        stroke="#8b5cf6"
                                        strokeWidth={4}
                                        fill="url(#areaColor)"
                                        style={{ filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.4))' }}
                                    />
                                </>
                            )}

                            {view === 'forecast' && (
                                <>
                                    <Bar
                                        yAxisId="left"
                                        dataKey="target"
                                        name="Planned Goal"
                                        fill={isDark ? "#1e293b" : "#f1f5f9"}
                                        strokeDasharray="4 4"
                                        stroke={isDark ? "#334155" : "#e2e8f0"}
                                        radius={[10, 10, 0, 0]}
                                        maxBarSize={40}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="actual"
                                        name="Predicted Production"
                                        stroke="#f59e0b"
                                        strokeWidth={4}
                                        strokeDasharray="8 4"
                                        dot={{ fill: '#f59e0b', r: 6, strokeWidth: 0 }}
                                    />
                                </>
                            )}

                            {/* Brush with Dynamic DataKey to avoid scale corruption */}
                            {view !== 'forecast' && data.length > 10 && (
                                <Brush
                                    dataKey="label"
                                    height={30}
                                    stroke={isDark ? "#3b82f6" : "#3b82f6"}
                                    fill={isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(241, 245, 249, 0.5)"}
                                    travelerWidth={15}
                                    gap={1}
                                >
                                    <ComposedChart>
                                        <Area
                                            dataKey={view === 'efficiency' ? "pr" : "actual"}
                                            fill={view === 'efficiency' ? "rgba(139, 92, 246, 0.1)" : "rgba(34, 197, 94, 0.1)"}
                                            stroke="none"
                                        />
                                    </ComposedChart>
                                </Brush>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
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
    forecast: PropTypes.arrayOf(PropTypes.object),
};

export default GenerationChart;
