import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, ChevronRight } from 'lucide-react';
import { processQuery } from '../../lib/chat/engine';
import type { BotResponse } from '../../lib/chat/engine';
import type { ChatAction } from '../../lib/chat/intents';
import { ChartRenderer } from './ChartRenderer';
import type { ChartPayload } from './ChartRenderer';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    actions?: ChatAction[];
    chart?: ChartPayload;
    timestamp: Date;
}

interface ChatWidgetProps {
    userType: 'admin' | 'tenure';
    userName?: string;
}

export function ChatWidget({ userType, userName: propUserName }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [name, setName] = useState(propUserName || '');
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                if (name) return; // Prop name takes precedence only if set
                const table = userType === 'admin' ? 'admins' : 'tenures';
                const { data } = await supabase.from(table).select('full_name').eq('id', user.id).single();
                if (data?.full_name) setName(data.full_name);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (messages.length === 0 && (name || !propUserName)) {
            const greetingName = name ? name.split(' ')[0] : 'there';
            setMessages([
                {
                    id: 'init',
                    sender: 'bot',
                    text: `Hi ${greetingName}! I'm NestBot. Ask me about revenue, complaints, or occupancy!`,
                    timestamp: new Date()
                }
            ]);
        }
    }, [name]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const response: BotResponse = await processQuery(userMsg.text, userType, userId);


        setIsTyping(false);
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: response.text,
            actions: response.actions,
            chart: response.chart,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
    };

    const handleAction = (action: ChatAction, chartPayload?: ChartPayload) => {
        if (action.type === 'navigate') {
            navigate(action.value);
            setIsOpen(false);
        } else if (action.type === 'link') {
            window.open(action.value, '_blank');
        } else if (action.type === 'download_csv' && chartPayload) {
            // Generate CSV
            const headers = Object.keys(chartPayload.data[0]);
            const csvRows = [
                headers.join(','), // Header row
                ...chartPayload.data.map((row: any) =>
                    headers.map(header => JSON.stringify(row[header], (_, value) => value ?? '')).join(',')
                )
            ];
            const csvContent = csvRows.join('\n');

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${chartPayload.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <>
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-[100] h-14 w-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-indigo-500/50 transition-shadow"
            >
                {isOpen ? <X /> : <MessageCircle />}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-[100] w-[350px] md:w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 ring-1 ring-black/5"
                    >
                        <div className="bg-slate-900 p-4 flex items-center gap-3 shadow-md">
                            <div className="h-10 w-10 bg-indigo-500/20 rounded-full flex items-center justify-center border border-white/10">
                                <Bot className="text-indigo-400 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">NestBot Assistant</h3>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" /> Online
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${msg.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                        }`}>
                                        <p>{msg.text}</p>

                                        {msg.chart && (
                                            <div className="mt-2 w-full min-w-[250px]">
                                                <ChartRenderer payload={msg.chart} />
                                            </div>
                                        )}

                                        {msg.actions && msg.actions.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {msg.actions.map((action, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAction(action, msg.chart)}
                                                        className="flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-800 px-3.5 py-2 rounded-lg hover:bg-indigo-200 transition-colors font-semibold border border-indigo-200 shadow-sm"
                                                    >
                                                        {action.label} <ChevronRight className="h-3 w-3" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <input
                                placeholder="Ask a question..."
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none shadow-sm transition-all"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
