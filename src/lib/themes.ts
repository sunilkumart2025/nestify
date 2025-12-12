export type ThemeId =
    | 'light'
    | 'feather-white'
    | 'dark'
    | 'midnight'
    | 'sky-blue'
    | 'earth-brown'
    | 'mint-fresh';

export interface ThemeDefinition {
    id: ThemeId;
    name: string;
    description: string;
    type: 'light' | 'dark' | 'colored';
    colors: {
        primary: string;
        background: string;
        card: string;
    };
}

export const APP_THEMES: ThemeDefinition[] = [
    // Light Variants
    {
        id: 'light',
        name: 'Nestify Lite',
        description: 'Soft whites, light grey cards, minimal shadows.',
        type: 'light',
        colors: { primary: '#2563EB', background: '#F8FAFC', card: '#FFFFFF' }
    },
    {
        id: 'feather-white',
        name: 'Feather White',
        description: 'Pure white, pastel highlights, smooth rounded.',
        type: 'light',
        colors: { primary: '#8B5CF6', background: '#FFFFFF', card: '#F3F4F6' }
    },

    // Dark Variants
    {
        id: 'dark',
        name: 'Nestify Dark',
        description: 'Deep charcoal, neon blue accents.',
        type: 'dark',
        colors: { primary: '#3B82F6', background: '#0F172A', card: '#1E293B' }
    },
    {
        id: 'midnight',
        name: 'Midnight Mode',
        description: 'Very dark navy, soft gradients, luxurious.',
        type: 'dark',
        colors: { primary: '#6366F1', background: '#020617', card: '#0F172A' }
    },

    // Colored Variants
    {
        id: 'sky-blue',
        name: 'Sky Blue',
        description: 'Blue gradient, white cards, glowing.',
        type: 'colored',
        colors: { primary: '#0EA5E9', background: '#E0F2FE', card: '#FFFFFF' }
    },
    {
        id: 'earth-brown',
        name: 'Earth Brown',
        description: 'Warm tan & brown, rustic cozy feel.',
        type: 'colored',
        colors: { primary: '#D97706', background: '#FFF7ED', card: '#FFEDD5' }
    },
    {
        id: 'mint-fresh',
        name: 'Mint Fresh',
        description: 'Mint green background, white cards.',
        type: 'colored',
        colors: { primary: '#10B981', background: '#ECFDF5', card: '#FFFFFF' }
    }
];
