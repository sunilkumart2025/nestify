export type ThemeId =
    | 'light'
    | 'feather-white'
    | 'day-breeze'
    | 'dark'
    | 'midnight'
    | 'night-vision'
    | 'sky-blue'
    | 'earth-brown'
    | 'mint-fresh'
    | 'crystal-glass'
    | 'aurora-glow';

export interface ThemeDefinition {
    id: ThemeId;
    name: string;
    description: string;
    type: 'light' | 'dark' | 'colored' | 'premium';
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
    {
        id: 'day-breeze',
        name: 'Day Breeze',
        description: 'Cool tone whites, soft teal primary.',
        type: 'light',
        colors: { primary: '#14B8A6', background: '#F0F9FF', card: '#E0F2FE' }
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
    {
        id: 'night-vision',
        name: 'Night Vision',
        description: 'Pitch black, bright accents, OLED friendly.',
        type: 'dark',
        colors: { primary: '#22C55E', background: '#000000', card: '#111111' }
    },

    // Colored Variants
    {
        id: 'sky-blue',
        name: 'Sky Blue Mode',
        description: 'Blue gradient, white cards, glowing.',
        type: 'colored',
        colors: { primary: '#0EA5E9', background: '#E0F2FE', card: '#FFFFFF' } // Gradient logic handled in CSS
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
    },

    // Premium Variants
    {
        id: 'crystal-glass',
        name: 'Crystal Glass',
        description: 'Glassmorphism, blur effects, transparency.',
        type: 'premium',
        colors: { primary: '#EC4899', background: 'linear-gradient(135deg, #6EE7B7 0%, #3B82F6 100%)', card: 'rgba(255,255,255,0.8)' }
    },
    {
        id: 'aurora-glow',
        name: 'Aurora Glow',
        description: 'Gradient background, smooth lighting.',
        type: 'premium',
        colors: { primary: '#A855F7', background: 'linear-gradient(to right, #24c6dc, #514a9d)', card: 'rgba(255,255,255,0.9)' }
    }
];
