import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Target, Zap } from 'lucide-react';
import clsx from 'clsx';

const Card = ({ title, value, unit, icon: Icon, color, index, subtitle }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-lg bg-opacity-10", color)}>
                    <Icon size={24} className={clsx("text-opacity-100", color.replace('bg-', 'text-'))} />
                </div>
                {/* Sparkline or extra info could go here */}
            </div>

            <div>
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="flex items-end gap-2 mt-1">
                    <span className="text-3xl font-bold tracking-tight">{value}</span>
                    <span className="text-sm text-muted-foreground mb-1 font-medium">{unit}</span>
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
            </div>
        </motion.div>
    );
};

const SummaryCards = ({ data }) => {
    // Aggregate Data
    const totalActual = data.reduce((acc, curr) => acc + curr.actual, 0);
    const totalTarget = data.reduce((acc, curr) => acc + curr.target, 0);

    // Calculate Overall PR (Weighted Average could be complex, for simplified dashboard: Total Actual / Total Target)
    // Or average of monthly PRs? Let's do Total / Total for accuracy over the year.
    let overallPR = 0;
    if (totalTarget > 0) overallPR = (totalActual / totalTarget) * 100;

    // Overall Status
    let status = 'Poor';
    if (overallPR >= 90) status = 'Excellent';
    else if (overallPR >= 80) status = 'Good';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card
                index={0}
                title="Performance Ratio (PR)"
                value={overallPR.toFixed(1)}
                unit="%"
                icon={Activity}
                color="bg-purple-500" // Purple for PR
                subtitle={<span className={clsx(
                    "font-bold",
                    status === 'Excellent' ? "text-green-500" : status === 'Good' ? "text-yellow-500" : "text-red-500"
                )}>{status} Performance</span>}
            />

            <Card
                index={1}
                title="Total Target"
                value={totalTarget.toLocaleString()}
                unit="units"
                icon={Target}
                color="bg-blue-500" // Blue for Target
                subtitle="Expected Yearly Output"
            />

            <Card
                index={2}
                title="Total Generation"
                value={totalActual.toLocaleString()}
                unit="units"
                icon={Zap}
                color="bg-green-500" // Green for Actual
                subtitle={`${((totalActual / totalTarget) * 100 || 0).toFixed(1)}% of Target Achieved`}
            />
        </div>
    );
};

import PropTypes from 'prop-types';

Card.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    unit: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    subtitle: PropTypes.node,
};

SummaryCards.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        actual: PropTypes.number.isRequired,
        target: PropTypes.number.isRequired,
    })).isRequired,
};

export default SummaryCards;
