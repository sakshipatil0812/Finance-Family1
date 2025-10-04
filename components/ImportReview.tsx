import React, { useState, useMemo } from 'react';
import { Household, Expense, ParsedTransaction, Category, Member } from '../types';
import Card from './common/Card';
import Button from './common/Button';

interface ImportReviewProps {
    transactions: Omit<ParsedTransaction, 'memberId'>[];
    fileName: string;
    onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    household: Household;
    onReset: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
};

const ImportReview: React.FC<ImportReviewProps> = ({ transactions, fileName, onAddExpense, household, onReset }) => {
    const initialReviewableTransactions = useMemo(() => {
        const defaultMemberId = household.members[0]?.id || '';
        return transactions
            .filter(t => t.type === 'debit') // Only import expenses (debits)
            .map(t => ({ ...t, memberId: defaultMemberId }));
    }, [transactions, household.members]);

    const [reviewableTransactions, setReviewableTransactions] = useState<ParsedTransaction[]>(initialReviewableTransactions);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(initialReviewableTransactions.map((_, index) => index)));
    const [isImporting, setIsImporting] = useState(false);
    
    const getCategory = (id: string): Category | undefined => household.categories.find(c => c.id === id);
    const getMember = (id: string): Member | undefined => household.members.find(m => m.id === id);

    const handleSelectionChange = (index: number) => {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedRows(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(new Set(reviewableTransactions.map((_, index) => index)));
        } else {
            setSelectedRows(new Set());
        }
    };
    
    const updateTransaction = (index: number, field: keyof ParsedTransaction, value: string) => {
        const updated = [...reviewableTransactions];
        updated[index] = { ...updated[index], [field]: value };
        setReviewableTransactions(updated);
    };

    const handleImportSelected = async () => {
        setIsImporting(true);
        const expensesToImport: Omit<Expense, 'id'>[] = [];
        const importedIndices = new Set<number>();

        selectedRows.forEach(index => {
            const t = reviewableTransactions[index];
            const amountInCents = Math.round(t.amount * 100);
            expensesToImport.push({
                description: t.description,
                amount: amountInCents,
                date: new Date(t.date).toISOString(),
                memberId: t.memberId,
                categoryId: t.categoryId,
                // For imported transactions, the payer covers the full amount by default.
                // The user can manually split it later if needed.
                splits: [{ memberId: t.memberId, amount: amountInCents }],
            });
            importedIndices.add(index);
        });

        try {
            await Promise.all(expensesToImport.map(exp => onAddExpense(exp)));
            
            // Remove imported transactions from the review list
            setReviewableTransactions(prev => prev.filter((_, index) => !importedIndices.has(index)));
            setSelectedRows(new Set()); // Clear selection

        } catch (error) {
            console.error("Error during import:", error);
            alert("An error occurred while importing expenses. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    const allSelected = selectedRows.size === reviewableTransactions.length && reviewableTransactions.length > 0;
    const debitsFound = transactions.filter(t => t.type === 'debit').length;
    const creditsFound = transactions.length - debitsFound;

    return (
        <Card className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Review & Import</h2>
                    <p className="text-gray-400 mt-1">
                        Found {debitsFound} expenses and {creditsFound} income transactions in "{fileName}".
                    </p>
                </div>
                 <div className="flex gap-3">
                    <Button variant="secondary" onClick={onReset}>Start Over</Button>
                    <Button onClick={handleImportSelected} disabled={isImporting || selectedRows.size === 0}>
                        {isImporting ? 'Importing...' : `Import ${selectedRows.size} Selected`}
                    </Button>
                </div>
            </div>

            {reviewableTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm responsive-table">
                        <thead className="text-xs text-gray-400 uppercase bg-slate-700/50">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="rounded bg-slate-600 border-slate-500 focus:ring-indigo-500" />
                                </th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Paid By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviewableTransactions.map((t, index) => (
                                <tr key={index} className={`border-b border-slate-700 ${selectedRows.has(index) ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'}`}>
                                    <td className="p-3 checkbox-cell">
                                        <input type="checkbox" checked={selectedRows.has(index)} onChange={() => handleSelectionChange(index)} className="rounded bg-slate-600 border-slate-500 focus:ring-indigo-500" />
                                    </td>
                                    <td data-label="Date" className="p-3 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-CA')}</td>
                                    <td data-label="Description" className="p-3 text-gray-200">{t.description}</td>
                                    <td data-label="Amount" className="p-3 text-right font-mono text-pink-400">-{formatCurrency(t.amount)}</td>
                                    <td data-label="Category" className="p-3">
                                        <select 
                                            value={t.categoryId} 
                                            onChange={e => updateTransaction(index, 'categoryId', e.target.value)} 
                                            className="bg-slate-700 border-slate-600 rounded-md text-sm p-1.5 w-full md:max-w-[150px]"
                                        >
                                            {household.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                        </select>
                                    </td>
                                    <td data-label="Paid By" className="p-3">
                                        <select 
                                            value={t.memberId} 
                                            onChange={e => updateTransaction(index, 'memberId', e.target.value)}
                                            className="bg-slate-700 border-slate-600 rounded-md text-sm p-1.5 w-full md:max-w-[120px]"
                                        >
                                            {household.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>All expenses from this file have been imported!</p>
                </div>
            )}
        </Card>
    );
};

export default ImportReview;