import { supabase } from '../../lib/supabase';
import { ADMIN_INTENTS, TENURE_INTENTS } from './intents';
import type { ChatAction } from './intents';
import { parseChartQuery } from './parser';
import { fetchChartData } from './dataEngine';
import type { ChartPayload } from '../../components/chat/ChartRenderer';
import { updateContext, mergeContext } from './ChatState';

export interface BotResponse {
    text: string;
    actions?: ChatAction[];
    chart?: ChartPayload;
}

export const processQuery = async (query: string, role: 'admin' | 'tenure', userId?: string): Promise<BotResponse> => {
    // Simulate "thinking" delay for realism
    const delay = Math.floor(Math.random() * 500) + 500; // 500-1000ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // 0. Check for Chart/Data Intent (Advanced NLP)
    let chartIntent = parseChartQuery(query);

    // Context Merging (Handle "Compare to...", "Show details")
    chartIntent = mergeContext(chartIntent);

    if (chartIntent.isChart) {
        // Update Context for next turn
        updateContext(chartIntent);

        // Async Log (Fire & Forget)
        if (userId) {
            supabase.from('chat_messages').insert([
                { user_id: userId, sender: 'user', content: query },
                {
                    user_id: userId,
                    sender: 'bot',
                    content: `Here is the ${chartIntent.metric} overview (${chartIntent.timeFrame}):`,
                    meta: { chart: chartIntent }
                }
            ]).then(({ error }: { error: any }) => {
                if (error) console.error("Chat Log Error", error);
            });
        }

        const chartPayload = await fetchChartData(chartIntent, role, userId);
        if (chartPayload) {
            return {
                text: `Here is the ${chartIntent.metric} overview (${chartIntent.timeFrame}):`,
                chart: chartPayload,
                actions: [
                    { label: 'Download CSV', type: 'download_csv', value: 'chart_data' }
                ]
            };
        }

        // If chart intent but no data (e.g. unauthorized), fallback or explain
        if (role !== 'admin' && (chartIntent.metric === 'revenue' || chartIntent.metric === 'occupancy')) {
            return {
                text: "I cannot show this data to tenants. Only admins have access.",
                actions: []
            };
        }
    }

    const intents = role === 'admin' ? ADMIN_INTENTS : TENURE_INTENTS;
    const lowerQuery = query.toLowerCase();

    // 1. Exact/Pattern Matching
    for (const intent of intents) {
        for (const pattern of intent.patterns) {
            if (pattern.test(lowerQuery)) {
                const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];

                // Async Log Intent Match
                if (userId) {
                    supabase.from('chat_messages').insert([
                        { user_id: userId, sender: 'user', content: query },
                        { user_id: userId, sender: 'bot', content: response, meta: { intent: intent.id } }
                    ]).then(({ error }: { error: any }) => {
                        if (error) console.error("Chat Log Error", error);
                    });
                }

                return {
                    text: response,
                    actions: intent.actions
                };
            }
        }
    }

    // 2. Greeting
    if (/hi|hello|hey|greetings/i.test(lowerQuery)) {
        const text = `Hello! How can I help you with your ${role === 'admin' ? 'hostel management' : 'stay'} today?`;

        if (userId) {
            supabase.from('chat_messages').insert([
                { user_id: userId, sender: 'user', content: query },
                { user_id: userId, sender: 'bot', content: text }
            ]).then(() => { });
        }

        return {
            text,
            actions: []
        };
    }

    // 3. Fallback
    return {
        text: "I'm still learning! Try asking about 'revenue', 'occupancy', or 'complaints'.",
        actions: []
    };
};
