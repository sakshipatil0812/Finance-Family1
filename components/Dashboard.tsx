import React, { useMemo } from 'react';
import { Household } from '../types';
import Card from './common/Card';
import ProgressBar from './common/ProgressBar';
import { timeAgo, formatDueDate } from '../utils/time';
import TrendChart from './TrendChart';
import { prepareTrendData } from '../utils/chartUtils';
import { MoneyIcon, PiggyBankIcon, ArrowPathIcon } from './icons/Icons';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

interface DashboardProps {
  household: Household;
}

const Dashboard: React.FC<DashboardProps> = ({ household }) => {
    const { members, expenses, budgets, categories, bucketGoals, subscriptions } = household;

    const expensesThisMonth = expenses
        .filter(exp => new Date(exp.date).getMonth() === new Date().getMonth());

    const totalExpensesThisMonth = expensesThisMonth.reduce((sum, exp) => sum + exp.amount, 0);

    const totalBudgetThisMonth = budgets.reduce((sum, b) => sum + b.amount, 0);
    
    const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
        
    const upcomingSubscriptions = [...subscriptions]
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
        .slice(0, 4);
        
    const trendData = prepareTrendData(expenses);
    
    const spendingByMember = useMemo(() => {
        const memberSpending: { [key: string]: number } = {};
        members.forEach(m => { memberSpending[m.id] = 0; });

        expensesThisMonth.forEach(expense => {
            expense.splits.forEach(split => {
                if (memberSpending[split.memberId] !== undefined) {
                    memberSpending[split.memberId] += split.amount;
                }
            });
        });

        return members.map(m => ({
            ...m,
            spent: memberSpending[m.id]
        })).sort((a,b) => b.spent - a.spent);
    }, [expensesThisMonth, members]);
    
    const totalSpentByMembers = spendingByMember.reduce((sum, m) => sum + m.spent, 0);


    const getCategory = (id: string) => categories.find(c => c.id === id);
    const getMember = (id: string) => members.find(m => m.id === id);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Welcome back, {members[0].name}!</h2>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-pink-500 to-orange-400 rounded-lg shadow-lg"><MoneyIcon className="w-6 h-6 text-white"/></div>
                        <div>
                            <h3 className="text-gray-300 font-semibold">Monthly Spending</h3>
                            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{formatCurrency(totalExpensesThisMonth)}</p>
                        </div>
                    </div>
                </Card>
                 <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-green-400 rounded-lg shadow-lg"><PiggyBankIcon className="w-6 h-6 text-white"/></div>
                        <div>
                            <h3 className="text-gray-300 font-semibold">Goals Progress</h3>
                            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{formatCurrency(bucketGoals.reduce((sum, g) => sum + g.currentAmount, 0))}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-400 rounded-lg shadow-lg"><ArrowPathIcon className="w-6 h-6 text-white"/></div>
                        <div>
                            <h3 className="text-gray-300 font-semibold">Upcoming Bills</h3>
                            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{subscriptions.length} Tracked</p>
                        </div>
                    </div>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Spending Trend */}
                <Card className="lg:col-span-3">
                    <h3 className="text-xl font-bold text-white mb-4">Spending Trend</h3>
                    <div className="h-72">
                        <TrendChart data={trendData} />
                    </div>
                </Card>
                
                {/* Spending by Member */}
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4">Spending by Member</h3>
                    <div className="space-y-4">
                        {spendingByMember.map(member => (
                            <div key={member.id}>
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full" />
                                        <span className="font-semibold text-gray-300">{member.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-white">{formatCurrency(member.spent)}</span>
                                </div>
                                <ProgressBar value={member.spent} max={totalSpentByMembers || 1} color="indigo" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>


            {/* Budgets & Upcoming Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Budgets Overview</h3>
                    <div className="space-y-4">
                        {budgets.slice(0, 4).map(budget => {
                            const category = getCategory(budget.categoryId);
                            const spent = expensesThisMonth
                                .filter(e => e.categoryId === budget.categoryId)
                                .reduce((sum, e) => sum + e.amount, 0);
                            const percentage = budget.amount > 0 ? spent / budget.amount : 0;
                            const color = percentage > 0.9 ? 'red' : percentage > 0.7 ? 'yellow' : 'indigo';
                            return (
                                <div key={budget.id}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-300">{category?.name}</span>
                                        <span className="text-sm text-gray-400">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                                    </div>
                                    <ProgressBar value={spent} max={budget.amount} color={color} />
                                </div>
                            )
                        })}
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Upcoming Recurring Payments</h3>
                    <div className="space-y-3">
                        {upcomingSubscriptions.map(sub => {
                            const category = getCategory(sub.categoryId);
                            return (
                                <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{category?.icon}</span>
                                        <div>
                                            <p className="font-semibold text-white">{sub.description}</p>
                                            <p className="text-sm text-gray-400">{formatCurrency(sub.amount)}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-purple-300">{formatDueDate(sub.nextDueDate)}</span>
                                </div>
                            );
                        })}
                        {upcomingSubscriptions.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No upcoming payments tracked.</p>}
                    </div>
                </Card>
            </div>

            {/* Recent Expenses */}
            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Recent Expenses</h3>
                <div className="space-y-3">
                    {recentExpenses.map((exp, index) => {
                        const category = getCategory(exp.categoryId);
                        const payer = getMember(exp.memberId);
                        const isSplit = exp.splits.length > 1;

                        return (
                            <div 
                                key={exp.id} 
                                className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{category?.icon}</div>
                                    <div>
                                        <p className="font-semibold text-white">{exp.description}</p>
                                        <p className="text-sm text-gray-400 flex items-center gap-2">
                                            <span>Paid by {payer?.name}</span>
                                            {isSplit && <span className="text-white text-xs font-bold px-2 py-0.5 bg-purple-600 rounded-full">SPLIT</span>}
                                            <span>·</span> 
                                            <span>{timeAgo(exp.date)}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-pink-400">-{formatCurrency(exp.amount)}</p>
                                    <p className="text-xs text-gray-500">{category?.name}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

        </div>
    );
};

export default Dashboard;