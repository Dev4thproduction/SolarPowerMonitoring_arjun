import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const GenerationChart = ({ data }) => {
    const { theme } = useTheme();

    // Define colors based on theme if needed, or use CSS variables
    // Recharts doesn't fully support CSS var() in 'fill' prop easily without some tricks
    // So we use standard hex/hsl or tailwind classes

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const axisStyle = {
        stroke: isDark ? '#94a3b8' : '#64748b', // slate-400 vs slate-500
        fontSize: 12
    };

    const tooltipStyle = {
        backgroundColor: isDark ? '#1e293b' : '#ffffff', // slate-800 vs white
        border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), // slate-700 vs slate-200
        borderRadius: '0.5rem',
        color: isDark ? '#f8fafc' : '#0f172a'
    };

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm h-[400px]">
            <h3 className="text-lg font-semibold mb-6">Monthly Generation</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="month" {...axisStyle} />
                    <YAxis {...axisStyle} />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: isDark ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                    <Bar
                        dataKey="target"
                        name="Target (Units)"
                        fill="#3b82f6" // Blue-500
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                    <Bar
                        dataKey="actual"
                        name="Actual (Units)"
                        fill="#22c55e" // Green-500
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

GenerationChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default GenerationChart;
