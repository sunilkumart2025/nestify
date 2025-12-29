import type { ChatAction } from './intents';

export interface QAItem {
    keywords: string[];
    answer: string;
    actions?: ChatAction[];
    role?: 'admin' | 'tenure' | 'all'; // Whom is this for?
}

export const KNOWLEDGE_BASE: QAItem[] = [
    // --- GENERAL / MARKETING ---
    {
        keywords: ['what is nestify', 'about nestify', 'who are you', 'what is your name'],
        answer: "I'm Nexon, your AI assistant for Nestify - the operating system for modern hostels. We help you automate billing, manage tenants, and track revenue.",
        role: 'all'
    },
    {
        keywords: ['contact', 'support', 'help', 'email'],
        answer: "You can reach our support team at support@nestify.xyz. For urgent issues, please call our helpline.",
        actions: [{ type: 'link', label: 'Email Support', value: 'mailto:support@nestify.xyz' }],
        role: 'all'
    },

    // --- BILLING (TENANT) ---
    {
        keywords: ['pay rent', 'make payment', 'how to pay'],
        answer: "You can pay your rent directly from the 'Payments' tab. We support UPI, Credit Cards, and Net Banking via Razorpay/Cashfree.",
        actions: [{ type: 'navigate', label: 'Go to Payments', value: '/tenure/payments' }],
        role: 'tenure'
    },
    {
        keywords: ['receipt', 'invoice', 'download'],
        answer: "All your past invoices and receipts are available in the Payments section. Look for the 'Download' icon next to paid invoices.",
        actions: [{ type: 'navigate', label: 'View Invoices', value: '/tenure/payments' }],
        role: 'tenure'
    },

    // --- BILLING (ADMIN) ---
    {
        keywords: ['create invoice', 'generate bill', 'add payment'],
        answer: "Navigate to the 'Billing' section to generate monthly rent invoices. You can also automate this in Settings.",
        actions: [{ type: 'navigate', label: 'Go to Billing', value: '/admin/billing' }],
        role: 'admin'
    },
    {
        keywords: ['revenue', 'earnings', 'profit'],
        answer: "I can show you detailed revenue charts! Just ask me 'Show revenue for this month' or 'Compare revenue vs last month'.",
        role: 'admin'
    },

    // --- COMPLAINTS ---
    {
        keywords: ['complaint', 'issue', 'repair', 'broken', 'not working'],
        answer: "Facing an issue? You can raise a trackable complaint ticket. Our staff usually responds within 24 hours.",
        actions: [{ type: 'navigate', label: 'Raise Complaint', value: '/tenure/complaints' }],
        role: 'tenure'
    },
    {
        keywords: ['resolve complaint', 'close ticket'],
        answer: "You can view and manage all resident complaints from the Complaints dashboard.",
        actions: [{ type: 'navigate', label: 'Manage Complaints', value: '/admin/complaints' }],
        role: 'admin'
    },

    // --- COMMUNITY ---
    {
        keywords: ['community', 'event', 'poll', 'neighbor'],
        answer: "Check out the Community Hub! You can see upcoming events, vote on polls, and connect with your hostel mates.",
        actions: [{ type: 'navigate', label: 'Go to Community', value: '/tenure/community' }],
        role: 'tenure'
    },

    // --- TROUBLESHOOTING ---
    {
        keywords: ['login', 'password', 'reset'],
        answer: "If you're having trouble logging in, please use the 'Forgot Password' link on the login page. If that fails, contact your admin.",
        role: 'all'
    },
    {
        keywords: ['app', 'mobile', 'android', 'ios'],
        answer: "Nestify works great on mobile browsers! We also have an Android app valid for tenants.",
        role: 'all'
    },
    {
        keywords: ['points', 'rewards', 'badges', 'gamification'],
        answer: "Earn NestPoints by paying rent on time and participating in community events! Check your rank on the Achievements page.",
        actions: [{ type: 'navigate', label: 'View Achievements', value: '/tenure/achievements' }],
        role: 'tenure'
    }
];

export const queryKnowledgeBase = (query: string, userRole: 'admin' | 'tenure'): { text: string; actions?: ChatAction[] } | null => {
    const lowerQuery = query.toLowerCase();

    // Simple keyword matching (can be enhanced with fuzzy search later)
    const match = KNOWLEDGE_BASE.find(item => {
        // 1. Check Role
        if (item.role !== 'all' && item.role !== userRole) return false;

        // 2. Check Match
        return item.keywords.some(k => lowerQuery.includes(k));
    });

    if (match) {
        return {
            text: match.answer,
            actions: match.actions
        };
    }

    return null;
};
