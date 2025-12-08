import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ThemeId } from '../lib/themes';
import { APP_THEMES } from '../lib/themes';

interface ThemeProviderProps {
    children: React.ReactNode;
}

interface ThemeProviderState {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
    isLoading: boolean;
}

const initialState: ThemeProviderState = {
    theme: 'light',
    setTheme: () => null,
    isLoading: true
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<ThemeId>('light');
    const [isLoading, setIsLoading] = useState(true);

    // 1. Initial Load: Fetch from DB or LocalStorage
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                // Fallback to local storage if no user
                const cached = localStorage.getItem('nestify-theme') as ThemeId;
                if (cached && APP_THEMES.some(t => t.id === cached)) {
                    setThemeState(cached);
                }

                if (session?.user) {
                    // Identify role by checking tenure or admin table
                    // Optimization: We could store role in metadata, but for now we check tables
                    // Actually, we can use the 'admins' table check since we know the logic

                    // Try fetch from admin
                    const { data: adminData } = await supabase
                        .from('admins')
                        .select('theme')
                        .eq('id', session.user.id)
                        .single();

                    if (adminData?.theme) {
                        setThemeState(adminData.theme as ThemeId);
                        localStorage.setItem('nestify-theme', adminData.theme);
                    } else {
                        // Try fetch from tenure
                        const { data: tenureData } = await supabase
                            .from('tenures')
                            .select('theme')
                            .eq('id', session.user.id)
                            .single();

                        if (tenureData?.theme) {
                            setThemeState(tenureData.theme as ThemeId);
                            localStorage.setItem('nestify-theme', tenureData.theme);
                        }
                    }
                }
            } catch (err) {
                console.error("Theme load error", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadTheme();
    }, []);

    // 2. Apply Theme to DOM
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove all known theme classes
        APP_THEMES.forEach(t => root.classList.remove(t.id));
        root.classList.remove('dark', 'light');

        // Logic for Dark/Light base class for Tailwind compatibility
        const selectedTheme = APP_THEMES.find(t => t.id === theme);
        const baseMode = selectedTheme?.type === 'light' || selectedTheme?.type === 'colored' ? 'light' : 'dark';

        root.classList.add(baseMode); // Adds 'dark' or 'light' for Tailwind dark: modifiers
        root.classList.add(theme); // Adds specific theme class for CSS variables

        // Special handling for Gradients (Crystal/Aurora) handled via CSS variable injection if needed
        // But our CSS handles .crystal-glass root variables, so clean enough.
    }, [theme]);

    // 3. Save Theme
    const setTheme = async (newTheme: ThemeId) => {
        // Optimistic UI update
        setThemeState(newTheme);
        localStorage.setItem('nestify-theme', newTheme);

        // Background DB sync
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Determine table to update (Try Both or use specific if known)
        // Simple strategy: Update both, one will succeed (or check existence first)

        // Note: Ideally we know the role context. For now, blind update is safe-ish/fastest
        // or we check role. Let's try Admin first.

        const { error: adminError } = await supabase
            .from('admins')
            .update({ theme: newTheme })
            .eq('id', user.id);

        if (adminError) {
            await supabase
                .from('tenures')
                .update({ theme: newTheme })
                .eq('id', user.id);
        }
    };

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, isLoading }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
