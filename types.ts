// Contains all type definitions for the application.

export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Rule {
  id: string;
  keyword: string;
  categoryId: string;
}

export interface Split {
  memberId: string;
  amount: number; // in cents
}

export interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  date: string; // ISO string
  memberId: string; // payer
  categoryId: string;
  splits: Split[];
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number; // in cents
}

export interface BucketGoal {
  id: string;
  name: string;
  targetAmount: number; // in cents
  currentAmount: number; // in cents
}

export interface Trip {
  id: string;
  name: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  budget: number; // in cents
  expenses: Expense[];
}

export interface Subscription {
  id: string;
  description: string;
  amount: number; // in cents
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string; // ISO string
  categoryId: string;
}

export interface Notification {
  id: string;
  message: string;
  date: string; // ISO string
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
}

export interface Household {
  id: string;
  name: string;
  members: Member[];
  categories: Category[];
  rules: Rule[];
  expenses: Expense[];
  budgets: Budget[];
  bucketGoals: BucketGoal[];
  trips: Trip[];
  subscriptions: Subscription[];
  notifications: Notification[];
  emailAlertsEnabled: boolean;
  monthlyIncome: number; // in cents
}

export interface ParsedTransaction {
    date: string; // "YYYY-MM-DD"
    description: string;
    amount: number; // as a standard number, not cents
    type: 'credit' | 'debit';
    categoryId: string;
    memberId: string;
}

export interface SavingsSuggestion {
    categoryName: string;
    reasoning: string;
    suggestion: string;
    potentialSavings: number; // in INR, not cents
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}