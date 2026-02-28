// Event Status Utilities
// Calculates ribbon text and live status for events based on their dates

export interface EventStatus {
    ribbonText: string | null;
    showLiveTag: boolean;
}

/**
 * Calculate the display status for an event based on its start and end dates
 * Ported from PHP activities.php logic
 */
export function getEventStatus(startDate: Date | string, endDate: Date | string): EventStatus {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();
    const nowTimestamp = now.getTime();

    const hoursUntilStart = (startTimestamp - nowTimestamp) / (1000 * 3600);
    const hoursSinceStart = (nowTimestamp - startTimestamp) / (1000 * 3600);
    const hoursUntilEnd = (endTimestamp - nowTimestamp) / (1000 * 3600);

    let ribbonText: string | null = null;
    let showLiveTag = false;

    // Upcoming - more than 24 hours away
    if (hoursUntilStart > 24) {
        const days = Math.ceil(hoursUntilStart / 24);
        ribbonText = `Live in ${days} day${days > 1 ? 's' : ''}`;
    } 
    // Upcoming - within 24 hours
    else if (hoursUntilStart > 0) {
        ribbonText = "Live in 1 day";
    }
    // Just started (within first 24 hours)
    else if (hoursSinceStart >= 0 && hoursSinceStart <= 24) {
        ribbonText = "Started Today";
    }
    // Currently live (past start, before end)
    else if (nowTimestamp > startTimestamp && nowTimestamp < endTimestamp) {
        showLiveTag = true;
        if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
            ribbonText = "Ends Today";
        } else if (hoursUntilEnd <= 48 && hoursUntilEnd > 24) {
            ribbonText = "Ends Tomorrow";
        } else if (hoursUntilEnd > 48) {
            const daysLeft = Math.ceil(hoursUntilEnd / 24);
            ribbonText = `${daysLeft} days left`;
        }
    }

    return { ribbonText, showLiveTag };
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    
    // If same day, only show once
    if (start.toDateString() === end.toDateString()) {
        return startStr;
    }
    
    return `${startStr} - ${endStr}`;
}
