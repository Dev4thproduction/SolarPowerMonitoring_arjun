import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import 'react-day-picker/dist/style.css';

const DateRangePicker = ({ range, onChange, containerClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [months, setMonths] = useState(window.innerWidth < 1024 ? 1 : 2);
    const containerRef = useRef(null);

    // Track window width for responsive months
    useEffect(() => {
        const handleResize = () => {
            setMonths(window.innerWidth < 1024 ? 1 : 2);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedRange = {
        from: range.start ? startOfDay(new Date(range.start)) : undefined,
        to: range.end ? startOfDay(new Date(range.end)) : undefined
    };

    const handleSelect = (newRange) => {
        if (!newRange) return;

        const update = {
            start: newRange.from ? format(newRange.from, 'yyyy-MM-dd') : range.start,
            end: newRange.to ? format(newRange.to, 'yyyy-MM-dd') : range.end
        };

        onChange(update);

        // Auto-close if both are selected
        if (newRange.from && newRange.to && !isSameDay(newRange.from, newRange.to)) {
            setTimeout(() => setIsOpen(false), 300);
        }
    };

    return (
        <div className={clsx("relative", containerClassName)} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 bg-muted/30 border border-muted-foreground/10 px-4 py-2.5 rounded-xl hover:bg-muted/50 transition-all group focus:ring-2 focus:ring-primary/40 outline-none"
            >
                <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-primary" />
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-0.5">Timeline Scan</span>
                        <span className="text-xs font-bold whitespace-nowrap">
                            {range.start ? format(new Date(range.start), 'MMM dd, yyyy') : 'Start'}
                            <span className="mx-2 text-muted-foreground/50">→</span>
                            {range.end ? format(new Date(range.end), 'MMM dd, yyyy') : 'End'}
                        </span>
                    </div>
                </div>
                <ChevronLeft size={16} className={clsx("text-muted-foreground group-hover:text-primary transition-transform", isOpen ? "rotate-90" : "-rotate-90")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 z-[100] bg-card border border-muted-foreground/10 rounded-[1.5rem] shadow-2xl p-6 backdrop-blur-xl"
                    >
                        <DayPicker
                            mode="range"
                            selected={selectedRange}
                            onSelect={handleSelect}
                            numberOfMonths={months}
                            defaultMonth={selectedRange.from || new Date()}
                            fromDate={new Date(2020, 0, 1)}
                            toDate={new Date()}
                            className="solar-calendar"
                            classNames={{
                                months: "flex flex-col lg:flex-row space-y-4 lg:space-x-8 lg:space-y-0",
                                month: "space-y-6",
                                caption: "flex justify-center pt-2 relative items-center mb-6",
                                caption_label: "rdp-caption_label",
                                nav: "space-x-1 flex items-center",
                                nav_button: "rdp-nav_button h-9 w-9 flex items-center justify-center rounded-xl transition-all",
                                nav_button_previous: "absolute left-2",
                                nav_button_next: "absolute right-2",
                                table: "w-full border-collapse",
                                head_row: "flex",
                                head_cell: "rdp-head_cell w-10",
                                row: "flex w-full mt-2",
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                                day: "rdp-day h-10 w-10 p-0 aria-selected:opacity-100",
                                day_selected: "rdp-day_selected",
                                day_today: "bg-muted/50 text-foreground ring-1 ring-primary/30",
                                day_outside: "rdp-day_outside opacity-50",
                                day_disabled: "text-muted-foreground opacity-20",
                                day_range_middle: "rdp-day_range_middle",
                                day_range_start: "rdp-day_range_start",
                                day_range_end: "rdp-day_range_end",
                                day_hidden: "invisible",
                            }}
                            components={{
                                IconLeft: ({ ...props }) => <ChevronLeft size={18} />,
                                IconRight: ({ ...props }) => <ChevronRight size={18} />,
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DateRangePicker;
