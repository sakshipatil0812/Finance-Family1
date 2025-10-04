import React, { useState, useCallback } from 'react';
import { Household, Subscription } from '../types';
import { detectRecurringPayments, SuggestedSubscription } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import { SparklesIcon, TrashIcon } from './icons/Icons';
import SkeletonLoader from './common/SkeletonLoader';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
};

interface SubscriptionsProps {
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const Subscriptions: React.FC<SubscriptionsProps> = ({ household, onUpdate }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestedSubscription[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const getCategory = (id: string) => household.categories.find(c => c.id === id);

    const handleScan = useCallback(async () => {
        setIsScanning(true);
        setError(null);
        setSuggestions([]);
        try {
            const results = await detectRecurringPayments(household);
            setSuggestions(results);
        } catch (err) {
            setError('Failed to scan for subscriptions. Please try again.');
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    }, [household]);

    const handleAddSubscription = (suggestion: SuggestedSubscription) => {
        const lastPaymentDate = new Date(suggestion.lastPaymentDate);
        let nextDueDate: Date;

        switch (suggestion.frequency) {
            case 'monthly':
                nextDueDate = new Date(lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 1));
                break;
            case 'yearly':
                nextDueDate = new Date(lastPaymentDate.setFullYear(lastPaymentDate.getFullYear() + 1));
                break;
            case 'weekly':
                nextDueDate = new Date(lastPaymentDate.setDate(lastPaymentDate.getDate() + 7));
                break;
            default:
                nextDueDate = new Date(); // Fallback
        }

        const newSubscription: Subscription = {
            id: `sub-${crypto.randomUUID()}`,
            description: suggestion.description,
            amount: Math.round(suggestion.amount * 100),
            frequency: suggestion.frequency,
            nextDueDate: nextDueDate.toISOString(),
            categoryId: suggestion.categoryId,
        };

        onUpdate({ subscriptions: [...household.subscriptions, newSubscription] });
        
        // Remove from suggestions list
        setSuggestions(prev => prev.filter(s => s.description !== suggestion.description));
    };

    const handleDismissSuggestion = (description: string) => {
        setSuggestions(prev => prev.filter(s => s.description !== description));
    };

    const handleDeleteSubscription = (id: string) => {
        if (window.confirm("Are you sure you want to delete this subscription?")) {
            onUpdate({ subscriptions: household.subscriptions.filter(s => s.id !== id) });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <Card>
                <h2 className="text-xl font-bold text-white mb-4">Tracked Subscriptions</h2>
                <div className="space-y-3">
                    {household.subscriptions.map(sub => {
                        const category = getCategory(sub.categoryId);
                        return (
                            <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{category?.icon}</span>
                                    <div>
                                        <p className="font-semibold text-white">{sub.description}</p>
                                        <p className="text-sm text-gray-400">{formatCurrency(sub.amount)} / {sub.frequency}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-300">Next: {new Date(sub.nextDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    <Button variant="danger" size="sm" className="p-2" onClick={() => handleDeleteSubscription(sub.id)}>
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {household.subscriptions.length === 0 && <p className="text-center text-gray-500 py-4">You are not tracking any subscriptions yet.</p>}
                </div>
            </Card>

            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <SparklesIcon className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">AI Subscription Detector</h2>
                </div>
                <p className="text-gray-400 mb-4">Let AI scan your spending history to find recurring payments you might have forgotten about.</p>
                <Button onClick={handleScan} disabled={isScanning}>
                    {isScanning ? 'Scanning...' : 'Scan for Subscriptions'}
                </Button>

                <div className="mt-6 space-y-4">
                    {isScanning && <SkeletonLoader className="h-20 w-full" />}
                    {error && <p className="text-red-400">{error}</p>}
                    
                    {!isScanning && suggestions.length > 0 && (
                        <h3 className="font-semibold text-white">Suggestions Found:</h3>
                    )}

                    {suggestions.map((s, index) => {
                        const category = getCategory(s.categoryId);
                        return (
                           <div key={index} className="p-3 bg-slate-900 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{category?.icon}</span>
                                    <div>
                                        <p className="font-semibold text-white">{s.description}</p>
                                        <p className="text-sm text-gray-400">{formatCurrency(s.amount * 100)} / {s.frequency}</p>
                                        <p className="text-xs text-gray-500 italic">Last seen: {new Date(s.lastPaymentDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 self-end sm:self-center">
                                    <Button variant="secondary" size="sm" onClick={() => handleDismissSuggestion(s.description)}>Dismiss</Button>
                                    <Button size="sm" onClick={() => handleAddSubscription(s)}>Add Subscription</Button>
                                </div>
                           </div>
                        );
                    })}

                    {!isScanning && suggestions.length === 0 && !error && (
                        <p className="text-gray-500 text-sm">Click scan to start. If no suggestions appear, the AI couldn't find any new recurring payments.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Subscriptions;
