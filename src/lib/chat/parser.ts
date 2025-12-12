
export type ChartMetric = 'revenue' | 'occupancy' | 'complaints' | 'my_dues';
export type TimeFrame = 'monthly' | 'yearly' | 'daily';

export interface DateRange {
    start?: Date;
    end?: Date;
    label?: string; // "Jan to Mar"
}

export interface ChartFilters {
    block?: string;
    room?: string;
    dateRange?: DateRange;
}

export interface ChartIntent {
    isChart: boolean;
    metric?: ChartMetric;
    timeFrame: TimeFrame;
    chartType: 'bar' | 'line' | 'pie';
    filters: ChartFilters;
    comparison?: boolean; // "Compare to..."
}

const MONTHS: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

export const parseChartQuery = (query: string): ChartIntent => {
    const lowerQuery = query.toLowerCase();

    const intent: ChartIntent = {
        isChart: false,
        timeFrame: 'monthly',
        chartType: 'bar',
        filters: {}
    };

    // 1. Detect Metric
    if (/revenue|income|rent|collection|payment|bill/i.test(lowerQuery)) {
        if (/my|mine/i.test(lowerQuery) || /due|pending/i.test(lowerQuery)) {
            intent.metric = 'my_dues';
        } else {
            intent.metric = 'revenue';
        }
        intent.isChart = true;
    } else if (/occupancy|occupied|vacant|room|bed/i.test(lowerQuery)) {
        intent.metric = 'occupancy';
        intent.isChart = true;
    } else if (/complaint|issue|ticket|request/i.test(lowerQuery)) {
        intent.metric = 'complaints';
        intent.isChart = true;
    }

    if (!intent.isChart) return intent;

    // 2. Detect Comparison
    if (/compare|vs|previous|last/i.test(lowerQuery) && /year|month/i.test(lowerQuery)) {
        intent.comparison = true;
    }

    // 3. Detect Entities (Block/Room)
    const blockMatch = lowerQuery.match(/block\s+([a-z])/i);
    if (blockMatch) intent.filters.block = blockMatch[1].toUpperCase();

    const roomMatch = lowerQuery.match(/room\s+(\d+)/i);
    if (roomMatch) intent.filters.room = roomMatch[1];

    // 4. Detect Date Ranges ("Jan to Mar")
    // Very basic Month parser for current year
    const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/g;
    const monthsFound = [...lowerQuery.matchAll(monthPattern)];

    if (monthsFound.length >= 2) {
        const startMonth = MONTHS[monthsFound[0][1].slice(0, 3)];
        const endMonth = MONTHS[monthsFound[1][1].slice(0, 3)];

        const now = new Date();
        const start = new Date(now.getFullYear(), startMonth, 1);
        const end = new Date(now.getFullYear(), endMonth + 1, 0); // Last day of end month

        intent.filters.dateRange = { start, end, label: `${monthsFound[0][0]} - ${monthsFound[1][0]}` };
    } else if (/last\s+(\d+)\s+month/i.test(lowerQuery)) {
        const num = parseInt(lowerQuery.match(/last\s+(\d+)\s+month/i)![1]);
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - num);
        intent.filters.dateRange = { start, end, label: `Last ${num} Months` };
    }

    // 5. Detect Chart Type Preferences
    if (/pie/i.test(lowerQuery) || /distribution/i.test(lowerQuery)) {
        intent.chartType = 'pie';
    } else if (/line/i.test(lowerQuery) || /trend/i.test(lowerQuery)) {
        intent.chartType = 'line';
    } else {
        // Intelligent Defaults
        if (intent.metric === 'revenue' && intent.timeFrame === 'monthly') intent.chartType = 'bar';
        if (intent.metric === 'complaints') intent.chartType = 'pie';
    }

    return intent;
};
