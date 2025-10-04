import React, { useState, useEffect } from 'react';
import { Household, BucketGoal } from '../types';
import { generateTransferSuggestion } from '../services/geminiService';
import Modal from './common/Modal';
import Button from './common/Button';
import SkeletonLoader from './common/SkeletonLoader';
import { SparklesIcon } from './icons/Icons';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
};

interface SmartTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: BucketGoal;
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const SuggestionSkeleton: React.FC = () => (
    <div className="space-y-4">
        <SkeletonLoader className="h-5 w-1/3 mb-1" />
        <SkeletonLoader className="h-10 w-1/2" />
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg space-y-2">
            <SkeletonLoader className="h-4 w-1/4" />
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-5/6" />
        </div>
    </div>
);

const SmartTransferModal: React.FC<SmartTransferModalProps> = ({ isOpen, onClose, goal, household, onUpdate }) => {
  const [suggestion, setSuggestion] = useState<{ amount: number; reasoning: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchSuggestion = async () => {
        setIsLoading(true);
        setError(null);
        try {
           // Simulate longer generation time
          await new Promise(resolve => setTimeout(resolve, 1500));
          const result = await generateTransferSuggestion(household, goal);
          setSuggestion(result);
          setTransferAmount(result.amount);
        } catch (err) {
          setError('Failed to get AI suggestion. Please try again.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSuggestion();
    }
  }, [isOpen, household, goal]);

  const handleConfirmTransfer = () => {
    if (transferAmount === null || transferAmount <= 0) return;
    
    const updatedGoals = household.bucketGoals.map(g => 
        g.id === goal.id 
          ? { ...g, currentAmount: g.currentAmount + transferAmount * 100 }
          : g
      );
    
    onUpdate({ bucketGoals: updatedGoals });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Smart Transfer to "${goal.name}"`}>
      <div className="space-y-4">
        {isLoading && <SuggestionSkeleton />}

        {error && <p className="text-red-400">{error}</p>}
        
        {!isLoading && !error && suggestion && (
          <div>
            <p className="text-gray-300 mb-2">AI suggests transferring:</p>
            <p className="text-4xl font-bold text-indigo-400">{formatCurrency(suggestion.amount * 100)}</p>
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-gray-400 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">Reasoning:</span>
                </p>
                <p className="text-sm text-gray-300 mt-1">{suggestion.reasoning}</p>
            </div>
          </div>
        )}

        <div className="pt-4">
          <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-300">
            Confirm or adjust amount (INR)
          </label>
          <input
            type="number"
            id="transferAmount"
            value={transferAmount ?? ''}
            onChange={(e) => setTransferAmount(parseFloat(e.target.value))}
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            type="button" 
            onClick={handleConfirmTransfer}
            disabled={isLoading || transferAmount === null || transferAmount <= 0}
          >
            Confirm Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SmartTransferModal;