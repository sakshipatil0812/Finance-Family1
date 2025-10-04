import { Household } from './types';

// FIX: Provide initial data for the application to function.
export const INITIAL_HOUSEHOLD_DATA: Household = {
  id: 'hh-1',
  name: "My Household",
  members: [
    { id: 'mem-1', name: 'User', avatarUrl: 'https://i.pravatar.cc/150?u=user' },
    { id: 'mem-2', name: 'Partner', avatarUrl: 'https://i.pravatar.cc/150?u=partner' },
  ],
  categories: [
    { id: 'cat-1', name: 'Groceries', icon: '🛒' },
    { id: 'cat-2', name: 'Utilities', icon: '💡' },
    { id: 'cat-3', name: 'Dining Out', icon: '🍔' },
    { id: 'cat-4', name: 'Transport', icon: '🚗' },
    { id: 'cat-5', name: 'Entertainment', icon: '🎬' },
    { id: 'cat-6', name: 'Shopping', icon: '🛍️' },
    { id: 'cat-7', name: 'Health', icon: '❤️‍🩹' },
    { id: 'cat-8', name: 'Other', icon: '❓' },
  ],
  rules: [
    { id: 'rule-1', keyword: 'zomato', categoryId: 'cat-3' },
    { id: 'rule-2', keyword: 'swiggy', categoryId: 'cat-3' },
    { id: 'rule-3', keyword: 'bigbasket', categoryId: 'cat-1' },
    { id: 'rule-4', keyword: 'uber', categoryId: 'cat-4' },
    { id: 'rule-5', keyword: 'ola', categoryId: 'cat-4' },
  ],
  expenses: [
    { id: 'exp-1', description: 'Weekly groceries', amount: 350000, date: new Date(Date.now() - 2 * 86400000).toISOString(), memberId: 'mem-1', categoryId: 'cat-1', splits: [{ memberId: 'mem-1', amount: 175000 }, { memberId: 'mem-2', amount: 175000 }] },
    { id: 'exp-2', description: 'Electricity Bill', amount: 220000, date: new Date(Date.now() - 5 * 86400000).toISOString(), memberId: 'mem-2', categoryId: 'cat-2', splits: [{ memberId: 'mem-1', amount: 110000 }, { memberId: 'mem-2', amount: 110000 }] },
    { id: 'exp-3', description: 'Dinner with friends', amount: 250000, date: new Date(Date.now() - 1 * 86400000).toISOString(), memberId: 'mem-1', categoryId: 'cat-3', splits: [{ memberId: 'mem-1', amount: 250000 }] },
    { id: 'exp-4', description: 'Fuel for car', amount: 300000, date: new Date(Date.now() - 3 * 86400000).toISOString(), memberId: 'mem-1', categoryId: 'cat-4', splits: [{ memberId: 'mem-1', amount: 300000 }] },
    { id: 'exp-5', description: 'Movie tickets', amount: 90000, date: new Date(Date.now() - 10 * 86400000).toISOString(), memberId: 'mem-2', categoryId: 'cat-5', splits: [{ memberId: 'mem-2', amount: 90000 }] },
    { id: 'exp-6', description: 'Netflix', amount: 64900, date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), memberId: 'mem-2', categoryId: 'cat-5', splits: [{ memberId: 'mem-1', amount: 32450 }, { memberId: 'mem-2', amount: 32450 }] },
    { id: 'exp-7', description: 'Netflix', amount: 64900, date: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(), memberId: 'mem-2', categoryId: 'cat-5', splits: [{ memberId: 'mem-2', amount: 64900 }] },
    { id: 'exp-8', description: 'Gym Membership', amount: 200000, date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), memberId: 'mem-1', categoryId: 'cat-7', splits: [{ memberId: 'mem-1', amount: 200000 }] },
  ],
  budgets: [
    { id: 'bud-1', categoryId: 'cat-1', amount: 2000000 },
    { id: 'bud-2', categoryId: 'cat-2', amount: 1000000 },
    { id: 'bud-3', categoryId: 'cat-3', amount: 1500000 },
    { id: 'bud-4', categoryId: 'cat-4', amount: 800000 },
  ],
  bucketGoals: [
    { id: 'goal-1', name: 'Goa Vacation', targetAmount: 7500000, currentAmount: 1500000 },
    { id: 'goal-2', name: 'New Laptop', targetAmount: 12000000, currentAmount: 8000000 },
  ],
  trips: [
    { 
      id: 'trip-1', 
      name: 'Manali Weekend', 
      startDate: '2024-08-15', 
      endDate: '2024-08-18', 
      budget: 3000000, 
      expenses: [
        { id: 'texp-1', description: 'Hotel', amount: 1500000, date: '2024-08-15', memberId: 'mem-1', categoryId: 'cat-4', splits: [{ memberId: 'mem-1', amount: 1500000 }] },
        { id: 'texp-2', description: 'Food', amount: 800000, date: '2024-08-16', memberId: 'mem-2', categoryId: 'cat-3', splits: [{ memberId: 'mem-2', amount: 800000 }] },
      ] 
    }
  ],
  subscriptions: [
      { id: 'sub-1', description: 'Netflix Subscription', amount: 64900, frequency: 'monthly', nextDueDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), categoryId: 'cat-5' },
      { id: 'sub-2', description: 'Gym Membership', amount: 200000, frequency: 'monthly', nextDueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), categoryId: 'cat-7' }
  ],
  notifications: [
    { id: 'notif-1', message: 'You are close to your Dining Out budget for this month.', date: new Date(Date.now() - 1 * 86400000).toISOString(), type: 'warning', isRead: false },
    { id: 'notif-2', message: 'Welcome to FinancelyAI! Add your first expense to get started.', date: new Date(Date.now() - 10 * 86400000).toISOString(), type: 'info', isRead: true },
  ],
  emailAlertsEnabled: true,
  monthlyIncome: 8000000, // Corresponds to ₹80,000
};
