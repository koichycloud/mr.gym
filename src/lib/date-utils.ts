// Utility functions for handling Peru timezone (UTC-5)
// This ensures that all date calculations (start of day, end of day, etc.)
// are done relative to Lima time, regardless of where the server is running (e.g. Vercel UTC).

const PERU_OFFSET_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

/**
 * Returns a new Date object representing the start of the day in Lima time,
 * expressed as a UTC Date.
 */
export function getLimaStartOfDay(date: Date = new Date()): Date {
    // Shift the input date to Lima time (as if it were UTC)
    const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
    // Set to midnight
    limaDate.setUTCHours(0, 0, 0, 0);
    // Shift back to actual UTC
    return new Date(limaDate.getTime() + PERU_OFFSET_MS);
}

/**
 * Returns a new Date object representing the end of the day in Lima time,
 * expressed as a UTC Date.
 */
export function getLimaEndOfDay(date: Date = new Date()): Date {
    const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
    limaDate.setUTCHours(23, 59, 59, 999);
    return new Date(limaDate.getTime() + PERU_OFFSET_MS);
}

/**
 * Returns a new Date object representing the start of the month in Lima time.
 */
export function getLimaStartOfMonth(date: Date = new Date()): Date {
    const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
    limaDate.setUTCDate(1);
    limaDate.setUTCHours(0, 0, 0, 0);
    return new Date(limaDate.getTime() + PERU_OFFSET_MS);
}

/**
 * Returns a new Date object representing the end of the month in Lima time.
 */
export function getLimaEndOfMonth(date: Date = new Date()): Date {
    const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
    limaDate.setUTCMonth(limaDate.getUTCMonth() + 1);
    limaDate.setUTCDate(0); // Last day of current month
    limaDate.setUTCHours(23, 59, 59, 999);
    return new Date(limaDate.getTime() + PERU_OFFSET_MS);
}

/**
 * Formats a Date object to a string like "YYYY-MM-DD" in Lima time.
 */
export function formatLimaDate(date: Date = new Date()): string {
    const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
    const yyyy = limaDate.getUTCFullYear();
    const mm = String(limaDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(limaDate.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
