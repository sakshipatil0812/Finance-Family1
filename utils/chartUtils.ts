import { Expense } from '../types';

export interface TrendData {
    labels: string[];
    currentMonthData: number[];
    previousMonthData: number[];
}

export const prepareTrendData = (expenses: Expense[]): TrendData => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const today = now.getDate();
    
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPreviousMonth = new Date(currentYear, currentMonth, 0).getDate();

    const labels = Array.from({ length: daysInCurrentMonth }, (_, i) => (i + 1).toString());
    const currentMonthData = new Array(daysInCurrentMonth).fill(0);
    const previousMonthData = new Array(daysInCurrentMonth).fill(0);

    const tempCurrent = new Array(daysInCurrentMonth).fill(0);
    const tempPrevious = new Array(daysInPreviousMonth).fill(0);

    // Filter and aggregate expenses by day
    for (const expense of expenses) {
        const expenseDate = new Date(expense.date);
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth();
        const expenseDay = expenseDate.getDate() - 1; // 0-indexed

        if (expenseYear === currentYear && expenseMonth === currentMonth && expenseDay < daysInCurrentMonth) {
            tempCurrent[expenseDay] += expense.amount / 100;
        } else if (
            (currentMonth === 0 && expenseYear === currentYear - 1 && expenseMonth === 11) || // Jan vs Dec
            (expenseYear === currentYear && expenseMonth === currentMonth - 1)
        ) {
            if (expenseDay < daysInPreviousMonth) {
                tempPrevious[expenseDay] += expense.amount / 100;
            }
        }
    }

    // Calculate cumulative sums
    tempCurrent.reduce((acc, val, i) => {
        // Only show data up to today for the current month
        currentMonthData[i] = (i < today) ? acc + val : null;
        return acc + val;
    }, 0);
    
    // Fill the rest of the current month with nulls
    for (let i = today; i < daysInCurrentMonth; i++) {
        currentMonthData[i] = null;
    }

    tempPrevious.reduce((acc, val, i) => {
        if (i < previousMonthData.length) {
          previousMonthData[i] = acc + val;
        }
        return acc + val;
    }, 0);
    
    // Ensure previous month data matches the length of current month labels
    if (previousMonthData.length > daysInCurrentMonth) {
        previousMonthData.length = daysInCurrentMonth;
    } else if (previousMonthData.length < daysInCurrentMonth) {
        const lastVal = previousMonthData[previousMonthData.length - 1] || 0;
        for (let i = previousMonthData.length; i < daysInCurrentMonth; i++) {
            previousMonthData.push(lastVal);
        }
    }

    return { labels, currentMonthData, previousMonthData };
};
