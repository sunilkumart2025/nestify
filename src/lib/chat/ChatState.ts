import type { ChartIntent } from './parser';

interface ChatContext {
    lastIntent?: ChartIntent;
    lastResponse?: string;
    timestamp: number;
}

let sessionContext: ChatContext = {
    timestamp: Date.now()
};

export const updateContext = (intent: ChartIntent) => {
    sessionContext = {
        lastIntent: intent,
        timestamp: Date.now()
    };
};

export const getContext = (): ChatContext => {
    // Reset context if older than 5 minutes
    if (Date.now() - sessionContext.timestamp > 5 * 60 * 1000) {
        sessionContext = { timestamp: Date.now() };
    }
    return sessionContext;
};

export const mergeContext = (newIntent: ChartIntent): ChartIntent => {
    const context = getContext();
    if (!context.lastIntent) return newIntent;

    // Logic: If new intent has "comparison" flag, use previous metric
    if (newIntent.comparison && !newIntent.metric) {
        newIntent.metric = context.lastIntent.metric;
        newIntent.isChart = true;
        // If "compare to last month", we need to handle date range shifting in engine
    }

    return newIntent;
};
