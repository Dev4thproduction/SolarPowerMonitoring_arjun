/**
 * Standard date format: DD-MM-YYYY
 * This utility ensures consistent date formatting across the application
 */

/**
 * Format a date string or Date object to DD-MM-YYYY format
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string in DD-MM-YYYY format
 */
export const formatDateDDMMYYYY = (dateInput) => {
    if (!dateInput) return '-';

    let d;

    // Handle various date formats
    if (typeof dateInput === 'string') {
        // Check if already in DD-MM-YYYY format
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
            return dateInput;
        }

        // Handle DD-MM-YYYY format (swap to parseable format)
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateInput)) {
            const parts = dateInput.split('-');
            if (parts.length === 3 && parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
                d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }

        // Try standard Date parsing if not already parsed
        if (!d || isNaN(d.getTime())) {
            d = new Date(dateInput);
        }
    } else if (dateInput instanceof Date) {
        d = dateInput;
    } else {
        return '-';
    }

    // Check for invalid date
    if (isNaN(d.getTime())) {
        return String(dateInput);
    }

    // Check for Unix epoch (Jan 1, 1970) which indicates bad data
    if (d.getFullYear() === 1970 && d.getMonth() === 0 && d.getDate() === 1) {
        // Try to extract date from the original string if possible
        return String(dateInput);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Format date for display (with weekday, e.g., "Mon, 30-12-2024")
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string with weekday
 */
export const formatDateWithWeekday = (dateInput) => {
    if (!dateInput) return '-';

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let d;

    if (typeof dateInput === 'string') {
        // Handle DD-MM-YYYY format
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateInput)) {
            const parts = dateInput.split('-');
            if (parts.length === 3 && parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
                d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }

        if (!d || isNaN(d.getTime())) {
            d = new Date(dateInput);
        }
    } else if (dateInput instanceof Date) {
        d = dateInput;
    } else {
        return '-';
    }

    if (isNaN(d.getTime())) {
        return String(dateInput);
    }

    // Check for Unix epoch
    if (d.getFullYear() === 1970 && d.getMonth() === 0 && d.getDate() === 1) {
        return String(dateInput);
    }

    const weekday = weekdays[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${weekday}, ${day}-${month}-${year}`;
};

/**
 * Parse a date string in various formats to a Date object
 * @param {string} dateStr - The date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Handle DD-MM-YYYY format
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) {
                return d;
            }
        }
    }

    // Try standard Date parsing
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d;
    }

    return null;
};

export default {
    formatDateDDMMYYYY,
    formatDateWithWeekday,
    parseDate
};
