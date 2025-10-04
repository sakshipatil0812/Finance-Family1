import React, { useState, useCallback } from 'react';
import { Household, SavingsSuggestion } from '../types';
import { generateSavingsSuggestions } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import SkeletonLoader from './common/SkeletonLoader';
import { LightBulbIcon, SparklesIcon } from './icons/Icons';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const SuggestionSkeleton: React.FC = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-800/50 border border-slate-700">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <SkeletonLoader className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-3">
                        <SkeletonLoader className="h-6 w-1/3" />
                        <SkeletonLoader className="h-4 w-full" />
                        <SkeletonLoader className="h-4 w-4/5" />
                    </div>
                    <div className="w-full md:w-48">
                       <SkeletonLoader className="h-16 w-full rounded-lg" />
                    </div>
                </div>
            </Card>
        ))}
    </div>
);

const SavingsCoach: React.FC<{ household: Household }> = ({ household }) => {
    const [suggestions, setSuggestions] = useState<SavingsSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    
    const getCategoryIcon = (categoryName: string) => {
        return household.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.icon || '💡';
    };

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);
        setHasAnalyzed(true);
        try {
            const results = await generateSavingsSuggestions(household);
            setSuggestions(results);
        } catch (err) {
            setError('Failed to get AI suggestions. Please try again later.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [household]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <Card>
                <div className="text-center">
                    <LightBulbIcon className="w-12 h-12 mx-auto text-amber-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white">AI Savings Coach</h2>
                    <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Discover personalized tips to reduce your spending and boost your savings, powered by Gemini.</p>
                    <div className="mt-6">
                        <Button onClick={handleAnalyze} disabled={isLoading} size="lg">
                            <SparklesIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? 'Analyzing Your Spending...' : 'Find Savings For Me'}</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {isLoading && <SuggestionSkeleton />}
            
            {error && <Card><p className="text-pink-400 text-center">{error}</p></Card>}

            {!isLoading && hasAnalyzed && (
                 <div className="space-y-4">
                    {suggestions.length > 0 ? (
                        suggestions.map((s, index) => (
                             <Card 
                                key={index} 
                                className="bg-slate-800/50 border border-slate-700 animate-fade-in-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    <div className="text-4xl pt-1">{getCategoryIcon(s.categoryName)}</div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white">{s.categoryName}</h3>
                                        <p className="text-sm text-gray-400 italic mt-1">"{s.reasoning}"</p>
                                        <p className="text-gray-200 mt-3">{s.suggestion}</p>
                                    </div>
                                    <div className="mt-3 md:mt-0 text-left md:text-right bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 w-full md:w-auto">
                                        <p className="text-sm font-semibold text-teal-300">Potential Savings</p>
                                        <p className="text-xl font-bold text-white">{formatCurrency(s.potentialSavings)}/mo</p>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                         <Card>
                            <p className="text-center text-gray-400">Great job! The AI couldn't find any obvious areas to cut back on right now. Keep up the good work.</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default SavingsCoach;