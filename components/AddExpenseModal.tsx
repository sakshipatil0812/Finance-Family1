import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Household, Expense, Split } from '../types';
import { analyzeReceiptWithGemini } from '../services/geminiService';
import Modal from './common/Modal';
import Button from './common/Button';
import { CameraIcon, SparklesIcon } from './icons/Icons';
import SkeletonLoader from './common/SkeletonLoader';
import { suggestCategory } from '../utils/expenseUtils';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

const formatCurrencyForInput = (amountInCents: number): string => (amountInCents / 100).toFixed(2);

const ReceiptAnalysisSkeleton: React.FC = () => (
    <div className="space-y-4">
        <div>
            <SkeletonLoader className="h-5 w-1/4 mb-2" />
            <SkeletonLoader className="h-10 w-full" />
        </div>
        <div>
            <SkeletonLoader className="h-5 w-1/3 mb-2" />
            <SkeletonLoader className="h-10 w-full" />
        </div>
        <div>
            <SkeletonLoader className="h-5 w-1/4 mb-2" />
            <SkeletonLoader className="h-10 w-full" />
        </div>
    </div>
);


const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, household, onAddExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(household.categories[0]?.id || '');
  const [memberId, setMemberId] = useState(household.members[0]?.id || ''); // Payer
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmountCents = useMemo(() => Math.round(parseFloat(amount || '0') * 100), [amount]);

  useEffect(() => {
    // This effect runs when the modal opens, or when the payer/total amount changes.
    // It resets the splits so the payer covers 100% of the cost by default.
    if (isOpen) {
        const defaultSplits = household.members.map(member => ({
            memberId: member.id,
            amount: member.id === memberId ? totalAmountCents : 0,
        }));
        setSplits(defaultSplits);
    }
  }, [isOpen, amount, memberId, household.members]);


  useEffect(() => {
    if (description && !isAnalyzing) {
      const suggestedCategoryId = suggestCategory(description, household.rules, household.categories);
      if (suggestedCategoryId) {
        setCategoryId(suggestedCategoryId);
      }
    }
  }, [description, household.rules, household.categories, isAnalyzing]);
  
  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId(household.categories[0]?.id || '');
    setMemberId(household.members[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setImage(null);
    setIsAnalyzing(false);
    setSplits([]);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        setImage(imageData);
        setIsAnalyzing(true);
        try {
          const result = await analyzeReceiptWithGemini(imageData, household);
          setDescription(result.description);
          setAmount(result.amount.toString());
          if (result.categoryName) {
            const matchingCategory = household.categories.find(c => c.name.toLowerCase() === result.categoryName!.toLowerCase());
            if (matchingCategory) {
              setCategoryId(matchingCategory.id);
            }
          }
        } catch (error) {
            console.error("Receipt analysis failed:", error);
            alert("Failed to analyze receipt. Please enter details manually.");
        } finally {
            setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const totalSplitAmount = useMemo(() => splits.reduce((sum, split) => sum + split.amount, 0), [splits]);
  const remainingAmount = useMemo(() => totalAmountCents - totalSplitAmount, [totalAmountCents, totalSplitAmount]);

  const handleSplitAmountChange = (memberId: string, value: string) => {
    const newAmount = Math.round(parseFloat(value || '0') * 100);
    setSplits(prevSplits => 
      prevSplits.map(split => 
        split.memberId === memberId ? { ...split, amount: newAmount } : split
      )
    );
  };

  const handleSplitEqually = () => {
    if (totalAmountCents <= 0 || household.members.length === 0) return;

    const memberCount = household.members.length;
    const baseAmount = Math.floor(totalAmountCents / memberCount);
    const remainder = totalAmountCents % memberCount;

    const newSplits = household.members.map((member, index) => ({
        memberId: member.id,
        amount: baseAmount + (index < remainder ? 1 : 0),
    }));
    setSplits(newSplits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || totalAmountCents <= 0 || !categoryId || !memberId || Math.abs(remainingAmount) > 0) {
      alert("Please fill all fields and ensure the expense is fully split.");
      return;
    }

    onAddExpense({
      description: description.trim(),
      amount: totalAmountCents,
      categoryId,
      memberId,
      date: new Date(date).toISOString(),
      splits: splits.filter(s => s.amount > 0), // Only include splits with an amount
    });
    resetForm();
    onClose();
  };
  
  const isFormValid = description.trim() && totalAmountCents > 0 && categoryId && memberId && remainingAmount === 0;

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} title="Add New Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        {image && <img src={image} alt="Receipt" className="rounded-lg max-h-40 w-auto mx-auto" />}
        
        {isAnalyzing ? <ReceiptAnalysisSkeleton /> : (
            <>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                  <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Weekly Groceries" className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount (INR)</label>
                    <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1" required step="0.01" />
                  </div>
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-300">Date</label>
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1" required>
                          {household.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="member" className="block text-sm font-medium text-gray-300">Paid By</label>
                        <select id="member" value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1" required>
                          {household.members.map(mem => <option key={mem.id} value={mem.id}>{mem.name}</option>)}
                        </select>
                    </div>
                </div>
            </>
        )}

        {/* Split Expense Section */}
        {totalAmountCents > 0 && (
          <div className="pt-4 border-t border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-white">Split Expense</h4>
              <Button type="button" variant="secondary" size="sm" onClick={handleSplitEqually}>Split Equally</Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {household.members.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                  <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                  <label htmlFor={`split-${member.id}`} className="flex-1 text-gray-300">{member.name}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input 
                      type="number"
                      id={`split-${member.id}`}
                      value={formatCurrencyForInput(splits.find(s => s.memberId === member.id)?.amount || 0)}
                      onChange={e => handleSplitAmountChange(member.id, e.target.value)}
                      className="w-28 bg-slate-700 border-slate-600 rounded-md shadow-sm text-right pl-7"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-3 p-2 rounded-lg text-sm font-medium text-center ${remainingAmount === 0 ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                {remainingAmount === 0 ? 'Splits match total' : `₹${formatCurrencyForInput(Math.abs(remainingAmount))} ${remainingAmount > 0 ? 'left to assign' : 'over-assigned'}`}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center pt-4 gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
              <CameraIcon className="w-5 h-5" />
              <span>Scan a receipt</span>
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
                <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose(); }} className="w-1/2 sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={!isFormValid || isAnalyzing} className="w-1/2 sm:w-auto">
                  {isAnalyzing ? 'Analyzing...' : 'Add Expense'}
                </Button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddExpenseModal;