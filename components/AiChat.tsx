import React, { useState, useEffect, useRef } from 'react';
import { Household, ChatMessage } from '../types';
import { Chat } from '@google/genai';
import { startAiChat } from '../services/geminiService';
import { XIcon, SparklesIcon } from './icons/Icons';
import Button from './common/Button';

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
}

const AiChat: React.FC<AiChatProps> = ({ isOpen, onClose, household }) => {
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const initializeChat = async () => {
            if (isOpen && !chatSession) {
                setIsLoading(true);
                const session = startAiChat(household);
                setChatSession(session);
                
                // Get initial greeting
                try {
                    const initialResponse = await session.sendMessageStream({ message: "Hello, introduce yourself briefly." });
                    let text = '';
                    for await (const chunk of initialResponse) {
                        text += chunk.text;
                    }
                    setMessages([{ role: 'model', content: text }]);
                } catch (error) {
                    console.error("AI Chat initialization failed:", error);
                    setMessages([{ role: 'model', content: "Hello! I'm your AI assistant. Unfortunately, I'm having a little trouble connecting right now." }]);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        initializeChat();
    }, [isOpen, household]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatSession) return;
        
        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chatSession.sendMessageStream({ message: currentInput });
            let text = '';
            setMessages(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of stream) {
                text += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = text;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
        const isUser = message.role === 'user';
        return (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md p-3 rounded-2xl shadow-md ${isUser ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}>
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900/70 backdrop-blur-2xl border-l border-slate-700/50 shadow-2xl flex flex-col animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">AI Financial Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => <MessageBubble key={index} message={msg} />)}
                    {isLoading && messages[messages.length-1]?.role === 'user' && (
                         <div className="flex justify-start">
                             <div className="max-w-md p-3 rounded-2xl bg-slate-700 text-gray-200 rounded-bl-lg">
                                 <div className="flex items-center gap-2">
                                     <span className="h-2 w-2 bg-pink-400 rounded-full animate-bounce delay-75"></span>
                                     <span className="h-2 w-2 bg-pink-400 rounded-full animate-bounce delay-150"></span>
                                     <span className="h-2 w-2 bg-pink-400 rounded-full animate-bounce delay-300"></span>
                                 </div>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-700 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your finances..."
                            className="flex-1 w-full bg-slate-700 border-slate-600 rounded-lg shadow-sm"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            Send
                        </Button>
                    </form>
                </div>
            </div>
             <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AiChat;