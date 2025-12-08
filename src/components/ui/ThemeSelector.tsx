import { APP_THEMES } from '../../lib/themes';
import { useTheme } from '../../context/ThemeContext';
import { Check, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const currentThemeName = APP_THEMES.find(t => t.id === theme)?.name || 'Default';

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Palette className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Appearance</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Current: <span className="font-semibold text-primary">{currentThemeName}</span>
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isOpen && (
                <div className="p-6 bg-white dark:bg-black/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {APP_THEMES.map((t) => {
                            const isActive = theme === t.id;
                            const isDark = t.type === 'dark' || t.type === 'premium';

                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTheme(t.id)}
                                    className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-lg
                                        ${isActive
                                            ? 'border-primary ring-2 ring-primary/20 scale-[1.02] shadow-md'
                                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                        }
                                    `}
                                >
                                    {/* Preview Header / Background */}
                                    <div
                                        className="h-24 w-full p-4 relative transition-colors"
                                        style={{ background: t.colors.background }}
                                    >
                                        {/* Mini UI Mockup */}
                                        <div className="flex gap-2 h-full">
                                            <div
                                                className="w-1/3 h-full rounded-lg shadow-sm opacity-90"
                                                style={{ background: t.colors.card }}
                                            />
                                            <div className="flex flex-col gap-2 w-2/3">
                                                <div
                                                    className="h-2 w-3/4 rounded-full opacity-80"
                                                    style={{ background: t.colors.primary }}
                                                />
                                                <div className="h-2 w-1/2 bg-current opacity-20 rounded-full" style={{ color: isDark ? 'white' : 'black' }} />
                                            </div>
                                        </div>

                                        {isActive && (
                                            <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg animate-in zoom-in">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Section */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 h-24 flex flex-col justify-center">
                                        <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">{t.name}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
