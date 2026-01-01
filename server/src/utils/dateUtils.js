/**
 * Date utility functions for consistent date handling across the application
 * Standardizes on DD-MM-YYYY format for input and storage
 */

/**
 * Parse date string in DD-MM-YYYY format to Date object
 * @param {string} dateStr - Date in DD-MM-YYYY format (e.g., "15-07-2024")
 * @returns {Date|null} - Date object or null if invalid
 */
function parseDDMMYYYY(dateStr) {
    if (!dateStr) return null;

    const str = String(dateStr).trim();

    // Match DD-MM-YYYY format
    const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) {
        console.warn(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY`);
        return null;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate ranges
    if (month < 1 || month > 12) {
        console.warn(`Invalid month: ${month} in date ${dateStr}`);
        return null;
    }

    if (day < 1 || day > 31) {
        console.warn(`Invalid day: ${day} in date ${dateStr}`);
        return null;
    }

    // Create date using UTC to avoid timezone issues
    // Month is 0-indexed in JavaScript Date (0 = January, 11 = December)
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Verify the date is valid
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date created from: ${dateStr}`);
        return null;
    }

    return date;
}

/**
 * Format Date object to DD-MM-YYYY string
 * @param {Date} date - Date object
 * @returns {string} - Date in DD-MM-YYYY format
 */
function formatToDDMMYYYY(date) {
    if (!date || !(date instanceof Date)) return '';

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
}

/**
 * Parse various date formats and convert to Date object
 * Supports: DD-MM-YYYY, YYYY-MM-DD, ISO 8601
 * @param {string|Date} input - Date in various formats
 * @returns {Date|null} - Date object or null if invalid
 */
function parseFlexibleDate(input) {
    if (!input) return null;

    // Already a Date object
    if (input instanceof Date) {
        return isNaN(input.getTime()) ? null : input;
    }

    const str = String(input).trim();

    // Try DD-MM-YYYY format first (our standard)
    let match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Try YYYY-MM-DD format (ISO)
    match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Try parsing as-is (for ISO 8601 strings)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        // Normalize to UTC midnight
        return new Date(Date.UTC(
            parsed.getUTCFullYear(),
            parsed.getUTCMonth(),
            parsed.getUTCDate(),
            0, 0, 0, 0
        ));
    }

    console.warn(`Could not parse date: ${str}`);
    return null;
}

/**
 * Get month name from Date object
 * @param {Date} date - Date object
 * @returns {string} - Month name (lowercase, e.g., 'jan', 'feb', etc.)
 */
function getMonthKey(date) {
    if (!date || !(date instanceof Date)) return 'jan';

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = date.getUTCMonth(); // 0-11

    return monthNames[monthIndex];
}

/**
 * Get month number (1-12) from Date object
 * @param {Date} date - Date object
 * @returns {number} - Month number (1 = January, 12 = December)
 */
function getMonthNumber(date) {
    if (!date || !(date instanceof Date)) return 1;
    return date.getUTCMonth() + 1; // getUTCMonth() returns 0-11, we want 1-12
}

/**
 * Validate date string in DD-MM-YYYY format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidDDMMYYYY(dateStr) {
    if (!dateStr) return false;

    const str = String(dateStr).trim();
    const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

    if (!match) return false;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;

    // Check if the date is actually valid (e.g., not Feb 30)
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
}

module.exports = {
    parseDDMMYYYY,
    formatToDDMMYYYY,
    parseFlexibleDate,
    getMonthKey,
    getMonthNumber,
    isValidDDMMYYYY
};
