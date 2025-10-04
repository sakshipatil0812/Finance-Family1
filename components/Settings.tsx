import React, { useState } from 'react';
import { Household, Rule, Budget, Member } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { TrashIcon, SparklesIcon, PencilIcon, PlusIcon } from './icons/Icons';
import { generateBudgetSuggestions, generateIncomeBasedBudget } from '../services/geminiService';
import SkeletonLoader from './common/SkeletonLoader';
import EditMemberModal from './EditMemberModal';

interface SettingsProps {
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const formatCurrency = (amountInCents: number): string => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const ToggleSwitch: React.FC<{ enabled: boolean, onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => {
    return (
        <button
            type="button"
            onClick={() => onChange(!enabled)}
            className={`${enabled ? 'bg-pink-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

const Settings: React.FC<SettingsProps> = ({ household, onUpdate }) => {
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState(household.categories[0]?.id || '');

  const [isGeneratingBudgets, setIsGeneratingBudgets] = useState(false);
  const [budgetSuggestions, setBudgetSuggestions] = useState<Array<{ categoryId: string; amount: number; reasoning: string }> | null>(null);

  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const handleOpenMemberModal = (member: Member | null) => {
      setSelectedMember(member);
      setIsEditMemberModalOpen(true);
  };


  const handleBudgetChange = (categoryId: string, newAmount: string) => {
      const amountInCents = Math.round(parseFloat(newAmount || '0') * 100);
      const existingBudget = household.budgets.find(b => b.categoryId === categoryId);
      let newBudgets: Budget[];

      if (existingBudget) {
          newBudgets = household.budgets.map(b => b.categoryId === categoryId ? { ...b, amount: amountInCents } : b)
      } else {
          const newBudget: Budget = { id: `bud-${categoryId}`, categoryId, amount: amountInCents };
          newBudgets = [...household.budgets, newBudget];
      }
      onUpdate({ budgets: newBudgets });
  };

  const handleIncomeChange = (newAmount: string) => {
      const amountInCents = Math.round(parseFloat(newAmount || '0') * 100);
      onUpdate({ monthlyIncome: amountInCents });
  };

  const handleGenerateBudgetsFromSpending = async () => {
      setIsGeneratingBudgets(true);
      setBudgetSuggestions(null);
      try {
          const suggestions = await generateBudgetSuggestions(household);
          setBudgetSuggestions(suggestions);
      } catch (error) {
          console.error("Failed to generate budget suggestions from spending:", error);
          alert("Could not generate AI budget suggestions. Please try again.");
      } finally {
          setIsGeneratingBudgets(false);
      }
  };
  
  const handleGenerateBudgetsFromIncome = async () => {
      if (!household.monthlyIncome || household.monthlyIncome <= 0) {
          alert("Please set a monthly income first.");
          return;
      }
      setIsGeneratingBudgets(true);
      setBudgetSuggestions(null);
      try {
          const suggestions = await generateIncomeBasedBudget(household.monthlyIncome, household.categories);
          setBudgetSuggestions(suggestions);
      } catch (error) {
          console.error("Failed to generate budget suggestions from income:", error);
          alert("Could not generate AI budget suggestions. Please try again.");
      } finally {
          setIsGeneratingBudgets(false);
      }
  };

  const handleApplySuggestions = () => {
      if (!budgetSuggestions) return;
      const newBudgets: Budget[] = household.categories.map(category => {
          const suggestion = budgetSuggestions.find(s => s.categoryId === category.id);
          const existingBudget = household.budgets.find(b => b.categoryId === category.id);

          if (suggestion) {
              return { id: existingBudget?.id || `bud-${category.id}`, categoryId: category.id, amount: suggestion.amount * 100 };
          }
          return existingBudget || { id: `bud-${category.id}`, categoryId: category.id, amount: 0 };
      });

      onUpdate({ budgets: newBudgets });
      setBudgetSuggestions(null); // Clear suggestions after applying
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim() || !newRuleCategoryId) return;

    const newRule: Rule = {
      id: `rule-${crypto.randomUUID()}`,
      keyword: newRuleKeyword.trim().toLowerCase(),
      categoryId: newRuleCategoryId,
    };

    onUpdate({ rules: [...household.rules, newRule] });
    setNewRuleKeyword('');
    setNewRuleCategoryId(household.categories[0]?.id || '');
  };
  
  const handleDeleteRule = (ruleId: string) => {
    onUpdate({ rules: household.rules.filter(rule => rule.id !== ruleId) });
  };

  const handleEmailAlertsToggle = (enabled: boolean) => {
      onUpdate({ emailAlertsEnabled: enabled });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Manage Family Members</h3>
        <div className="space-y-3">
            {household.members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                        <span className="font-semibold text-lg text-white">{member.name}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenMemberModal(member)}>
                        <PencilIcon className="w-4 h-4" />
                        <span className="ml-2 hidden sm:inline">Edit</span>
                    </Button>
                </div>
            ))}
        </div>
        <div className="mt-4 border-t border-slate-700/50 pt-4">
            <Button onClick={() => handleOpenMemberModal(null)} className="w-full">
                <PlusIcon className="w-5 h-5" />
                <span>Add New Member</span>
            </Button>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Financial Profile</h3>
         <div className="p-3 bg-slate-800/50 rounded-lg">
            <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-300">
                Monthly Household Income (INR)
            </label>
            <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                    type="number"
                    id="monthlyIncome"
                    value={household.monthlyIncome > 0 ? household.monthlyIncome / 100 : ''}
                    onChange={e => handleIncomeChange(e.target.value)}
                    placeholder="e.g., 80000"
                    className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm pl-7 font-mono text-lg"
                    step="1000"
                />
            </div>
             <p className="text-xs text-gray-500 mt-2">This is used by the AI to recommend a personalized budget plan for you.</p>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Notification Preferences</h3>
        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
            <div>
                <p className="font-semibold text-white">Email Alerts for Overspending</p>
                <p className="text-sm text-gray-400">Receive an email when you're about to exceed a budget.</p>
            </div>
            <ToggleSwitch enabled={household.emailAlertsEnabled} onChange={handleEmailAlertsToggle} />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Manage Monthly Budgets</h3>
        <div className="space-y-3">
            {household.categories.map(category => {
                const budget = household.budgets.find(b => b.categoryId === category.id);
                return (
                    <div key={category.id} className="flex items-center justify-between gap-4 p-2 bg-slate-800/50 rounded-lg">
                        <label htmlFor={`budget-${category.id}`} className="flex-1 font-semibold text-gray-200">
                            {category.icon} {category.name}
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">₹</span>
                            <input
                                type="number"
                                id={`budget-${category.id}`}
                                value={budget ? budget.amount / 100 : ''}
                                onChange={e => handleBudgetChange(category.id, e.target.value)}
                                placeholder="0"
                                className="w-28 bg-slate-700 border-slate-600 rounded-md shadow-sm text-right font-mono"
                                step="100"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
        
        <div className="mt-6 border-t border-slate-700/50 pt-6">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="w-6 h-6 text-purple-400" />
                <h4 className="text-lg font-bold text-white">AI Budget Assistant</h4>
            </div>
            <p className="text-gray-400 mb-4">Let AI create a personalized monthly budget plan for you.</p>
            <div className="flex flex-wrap gap-3">
                <Button onClick={handleGenerateBudgetsFromSpending} disabled={isGeneratingBudgets} variant="secondary">
                    {isGeneratingBudgets ? 'Analyzing...' : 'Suggest from Spending'}
                </Button>
                <Button onClick={handleGenerateBudgetsFromIncome} disabled={isGeneratingBudgets || household.monthlyIncome <= 0} title={household.monthlyIncome <= 0 ? "Set your monthly income first" : ""}>
                    {isGeneratingBudgets ? 'Analyzing...' : 'Suggest from Income'}
                </Button>
            </div>


            {isGeneratingBudgets && (
                <div className="mt-4 space-y-2">
                    {[...Array(3)].map((_, i) => <SkeletonLoader key={i} className="h-10 w-full" />)}
                </div>
            )}

            {budgetSuggestions && (
                <div className="mt-6 space-y-4">
                    <h5 className="font-bold text-white">AI Suggestions:</h5>
                    <div className="space-y-3">
                        {budgetSuggestions.map(suggestion => {
                            const category = household.categories.find(c => c.id === suggestion.categoryId);
                            if (!category) return null;
                            return (
                                <div key={suggestion.categoryId} className="p-3 bg-slate-900/50 rounded-lg">
                                    <div className="flex justify-between items-center font-semibold">
                                        <span>{category.icon} {category.name}</span>
                                        <span className="text-purple-400">{formatCurrency(suggestion.amount * 100)}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1 italic">"{suggestion.reasoning}"</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setBudgetSuggestions(null)}>Dismiss</Button>
                        <Button onClick={handleApplySuggestions}>Apply Suggestions</Button>
                    </div>
                </div>
            )}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Auto-Categorization Rules</h3>
        <div className="space-y-2 mb-6">
            {household.rules.map((rule, index) => (
                <div 
                    key={rule.id} 
                    className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <span>If description contains "<span className="font-mono text-purple-400">{rule.keyword}</span>", categorize as <span className="font-semibold text-gray-200">{household.categories.find(c => c.id === rule.categoryId)?.name}</span></span>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteRule(rule.id)} className="p-1.5">
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            ))}
        </div>
        
        <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-3 border-t border-slate-700/50 pt-4">
            <input 
                type="text" 
                placeholder="New keyword (e.g., netflix)" 
                value={newRuleKeyword}
                onChange={e => setNewRuleKeyword(e.target.value)}
                className="flex-1 bg-slate-700 border-slate-600 rounded-md shadow-sm"
                required
            />
            <select
                value={newRuleCategoryId}
                onChange={e => setNewRuleCategoryId(e.target.value)}
                className="bg-slate-700 border-slate-600 rounded-md shadow-sm"
                required
            >
                {household.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
            <Button type="submit">Add Rule</Button>
        </form>
      </Card>
      {isEditMemberModalOpen && (
        <EditMemberModal
            isOpen={isEditMemberModalOpen}
            onClose={() => setIsEditMemberModalOpen(false)}
            member={selectedMember}
            household={household}
            onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default Settings;