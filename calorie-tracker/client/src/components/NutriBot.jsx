import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import api from '../api';
import { MessageSquare, X, Send, Loader2, Bot, Sparkles } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
    'What should I eat to lose weight? 🔥',
    'How many calories in 1 banana? 🍌',
    'Best high-protein vegetarian foods? 🥗',
    'What is a calorie deficit?',
];

const NutriBot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: "Hi! I'm **NutriBot** 🌿 — your personal AI nutrition assistant.\n\nAsk me anything about food, calories, diet tips, or weight goals! I'm here to help.",
            id: 'welcome',
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 200);
    }, [open]);

    const sendMessage = async (text) => {
        const userText = text || input.trim();
        if (!userText || loading) return;
        setInput('');

        const userMsg = { role: 'user', text: userText, id: Date.now() };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setLoading(true);

        try {
            // Send all previous messages (excluding welcome) as history context
            const history = newHistory
                .filter(m => m.id !== 'welcome')
                .slice(0, -1); // exclude the just-added user message

            const res = await api.post('/api/chat', {
                message: userText,
                history,
            });

            setMessages(prev => [...prev, { role: 'bot', text: res.data.reply, id: Date.now() + 1 }]);
        } catch (err) {
            const isRateLimit = err.response?.status === 429 || err.response?.data?.error === 'RATE_LIMIT';
            setMessages(prev => [...prev, {
                role: 'bot',
                text: isRateLimit
                    ? "I'm getting too many requests right now ⏳ — please wait 30 seconds and try again!"
                    : "Hmm, I couldn't connect right now. Please try again in a moment! 🔄",
                id: Date.now() + 1,
            }]);
        } finally {
            setLoading(false);
        }
    };

    // Render simple bold/italic markdown in bot messages
    const renderText = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part === '\n') return <br key={i} />;
            return part;
        });
    };

    return (
        <>
            {/* Floating button */}
            <button
                className={`nutribot-fab ${open ? 'open' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-label="Open NutriBot chat"
            >
                {open ? <X size={22} /> : <MessageSquare size={22} />}
                {!open && <span className="nutribot-fab-label">NutriBot</span>}
            </button>

            {/* Chat panel */}
            <div className={`nutribot-panel ${open ? 'visible' : ''}`}>
                {/* Header */}
                <div className="nutribot-header">
                    <div className="nutribot-header-left">
                        <div className="nutribot-avatar">
                            <Bot size={18} />
                        </div>
                        <div>
                            <div className="nutribot-title">NutriBot <Sparkles size={12} className="nutribot-sparkle" /></div>
                            <div className="nutribot-status">
                                <span className="nutribot-dot" />
                                AI Nutrition Assistant
                            </div>
                        </div>
                    </div>
                    <button className="nutribot-close" onClick={() => setOpen(false)}><X size={16} /></button>
                </div>

                {/* Messages */}
                <div className="nutribot-messages">
                    {messages.map(msg => (
                        <div key={msg.id} className={`nutribot-msg ${msg.role}`}>
                            {msg.role === 'bot' && (
                                <div className="nutribot-msg-avatar"><Bot size={12} /></div>
                            )}
                            <div className="nutribot-msg-bubble">
                                {renderText(msg.text)}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="nutribot-msg bot">
                            <div className="nutribot-msg-avatar"><Bot size={12} /></div>
                            <div className="nutribot-msg-bubble nutribot-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    {/* Suggested questions — show only at start */}
                    {messages.length === 1 && !loading && (
                        <div className="nutribot-suggestions">
                            {SUGGESTED_QUESTIONS.map(q => (
                                <button key={q} className="nutribot-suggestion-btn" onClick={() => sendMessage(q)}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="nutribot-input-row">
                    <input
                        ref={inputRef}
                        className="nutribot-input"
                        placeholder="Ask about nutrition, calories, diet..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        className="nutribot-send-btn"
                        onClick={() => sendMessage()}
                        disabled={loading || !input.trim()}
                    >
                        {loading ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
                    </button>
                </div>
            </div>
        </>
    );
};

export default NutriBot;
