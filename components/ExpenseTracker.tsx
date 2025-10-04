import React, { useState, useMemo } from 'react';
import { Household, Expense } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { TrashIcon, ArrowDownTrayIcon } from './icons/Icons';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
};

interface ExpenseTrackerProps {
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ household, onUpdate }) => {
    const { expenses, members, categories } = household;
    
    const [filter, setFilter] = useState<{ memberId: string, categoryId: string }>({ memberId: 'all', categoryId: 'all' });

    const getCategory = (id: string) => categories.find(c => c.id === id);
    const getMember = (id: string) => members.find(m => m.id === id);

    const handleDeleteExpense = async (expenseId: string) => {
        if(window.confirm('Are you sure you want to delete this expense?')) {
            await onUpdate({
                expenses: household.expenses.filter(exp => exp.id !== expenseId)
            });
        }
    };

    const filteredExpenses = useMemo(() => {
        return [...expenses]
            .filter(exp => filter.memberId === 'all' || exp.splits.some(s => s.memberId === filter.memberId && s.amount > 0))
            .filter(exp => filter.categoryId === 'all' || exp.categoryId === filter.categoryId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, filter]);
    
    // Total amount is the sum of the full expense amounts, not the splits
    const totalFilteredAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const handleExportCSV = () => {
      if (filteredExpenses.length === 0) {
          alert("No expenses to export.");
          return;
      }

      const headers = ["Expense ID", "Date", "Description", "Total Amount (INR)", "Category", "Payer", "Split Member", "Member's Share (INR)"];
      
      const formatCSVCell = (cellData: string) => {
          const cell = String(cellData || '');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
      };
      
      const csvRows = [headers.join(',')];
      
      filteredExpenses.forEach(exp => {
          exp.splits.forEach(split => {
              if (split.amount > 0) {
                  const row = [
                      formatCSVCell(exp.id),
                      new Date(exp.date).toISOString().split('T')[0],
                      formatCSVCell(exp.description),
                      (exp.amount / 100).toFixed(2),
                      formatCSVCell(getCategory(exp.categoryId)?.name || 'Uncategorized'),
                      formatCSVCell(getMember(exp.memberId)?.name || 'Unknown'),
                      formatCSVCell(getMember(split.memberId)?.name || 'Unknown'),
                      (split.amount / 100).toFixed(2)
                  ];
                  csvRows.push(row.join(','));
              }
          });
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement("a");
      if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          const date = new Date().toISOString().split('T')[0];
          link.setAttribute("href", url);
          link.setAttribute("download", `financely-split-expenses-${date}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      }
    };

  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Expense Tracker</h2>
                <p className="text-gray-400 mt-1">Showing {filteredExpenses.length} of {expenses.length} transactions.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-gray-300">Total Filtered Amount</p>
                    <p className="text-2xl font-bold text-pink-400">-{formatCurrency(totalFilteredAmount)}</p>
                </div>
                <Button variant="secondary" onClick={handleExportCSV} title="Export filtered expenses to CSV">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span className="hidden sm:inline ml-2">Export CSV</span>
                </Button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
                <label htmlFor="memberFilter" className="block text-sm font-medium text-gray-300">Filter by Member Involved</label>
                <select 
                    id="memberFilter" 
                    className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                    value={filter.memberId}
                    onChange={(e) => setFilter(prev => ({ ...prev, memberId: e.target.value }))}
                >
                    <option value="all">All Members</option>
                    {members.map(mem => <option key={mem.id} value={mem.id}>{mem.name}</option>)}
                </select>
            </div>
            <div className="flex-1">
                <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-300">Filter by Category</label>
                <select 
                    id="categoryFilter" 
                    className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                    value={filter.categoryId}
                    onChange={(e) => setFilter(prev => ({ ...prev, categoryId: e.target.value }))}
                >
                    <option value="all">All Categories</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
        </div>

        {/* Expense List */}
        <div className="space-y-3">
          {filteredExpenses.map((exp: Expense, index: number) => {
            const category = getCategory(exp.categoryId);
            const payer = getMember(exp.memberId);
            const isSplit = exp.splits.length > 1;
            
            return (
              <div 
                key={exp.id} 
                className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4 w-full">
                  <span className="text-2xl mt-1 md:mt-0">{category?.icon || '❓'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{exp.description}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · Paid by '}
                      <span className="font-medium text-gray-300">{payer?.name}</span>
                      {isSplit && <span className="text-purple-400 text-xs font-bold ml-1 p-1 bg-purple-500/10 rounded">SPLIT</span> }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pl-10 md:pl-0 justify-end">
                  <p className="font-bold text-lg text-pink-400 flex-1 md:flex-none text-right">-{formatCurrency(exp.amount)}</p>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteExpense(exp.id)} className="p-2">
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {filteredExpenses.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <p>No expenses match your filters.</p>
            </div>
        )}
      </Card>
    </div>
  );
};

export default ExpenseTracker;