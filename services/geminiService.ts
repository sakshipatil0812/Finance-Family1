import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Household, BucketGoal, Expense, ParsedTransaction, Subscription, SavingsSuggestion, Category } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatCurrencyForPrompt = (amountInCents: number): number => {
    return amountInCents / 100;
};

type UncategorizedTransaction = Omit<ParsedTransaction, 'categoryId' | 'memberId'>;
type CategorizedTransaction = Omit<ParsedTransaction, 'memberId'>;
export type SuggestedSubscription = Omit<Subscription, 'id' | 'nextDueDate'> & { lastPaymentDate: string };


/**
 * Analyzes a receipt image to extract transaction details.
 * @param imageDataUrl - The base64 encoded image data URL.
 * @param household - The household data containing categories for suggestion.
 * @returns An object with description, amount, and suggested category name.
 */
export const analyzeReceiptWithGemini = async (
  imageDataUrl: string,
  household: Household
): Promise<{ description: string; amount: number; categoryName: string; }> => {
  const match = imageDataUrl.match(/^data:(image\/.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data URL');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const categoryNames = household.categories.map(c => c.name).join(', ');
  const rulesText = household.rules.map(r => `If description contains "${r.keyword}", the category is "${household.categories.find(c => c.id === r.categoryId)?.name}".`).join('\n');
  const recentExpensesText = household.expenses.slice(0, 10).map(e => `- ${e.description} (${household.categories.find(c => c.id === e.categoryId)?.name})`).join('\n');

  const textPart = {
    text: `Analyze this receipt. Your primary goal is to extract the total amount, a short description, and suggest the most relevant category.

    Here is some context about the user's finances:
    - Available Categories: [${categoryNames}]
    - User's Custom Rules (these have the highest priority):
    ${rulesText || 'No rules defined.'}
    - User's Recent Spending History:
    ${recentExpensesText || 'No recent expenses.'}

    Based on the image and the context provided, please extract the following information. The currency is INR.`,
  };
  
  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "A short, clear description of the purchase (e.g., 'Groceries from Reliance Mart')."
            },
            amount: {
              type: Type.NUMBER,
              description: "The total amount from the receipt as a number (e.g., 450.75)."
            },
            categoryName: {
              type: Type.STRING,
              description: `The most relevant category from the provided list. Your suggestion should be one of these exact names: [${categoryNames}].`
            }
          },
          required: ["description", "amount", "categoryName"]
        }
      }
  });

  const jsonString = response.text.trim();
  return JSON.parse(jsonString);
};

/**
 * Generates a monthly spending report based on household data.
 * @param household - The household data.
 * @returns A markdown string containing the report.
 */
export const generateSpendingReport = async (household: Household): Promise<string> => {
    const expensesText = household.expenses
        .filter(e => new Date(e.date).getMonth() === new Date().getMonth()) // Only this month's expenses
        .map(e => {
            const category = household.categories.find(c => c.id === e.categoryId)?.name || 'Uncategorized';
            const member = household.members.find(m => m.id === e.memberId)?.name || 'Unknown';
            return `- ${e.description}: ${formatCurrencyForPrompt(e.amount)} on ${new Date(e.date).toLocaleDateString()} by ${member} [${category}]`;
        })
        .join('\n');

    const budgetsText = household.budgets.map(b => {
        const category = household.categories.find(c => c.id === b.categoryId)?.name || 'Uncategorized';
        return `- ${category}: ${formatCurrencyForPrompt(b.amount)}`;
    }).join('\n');
    
    const prompt = `You are a friendly and insightful financial analyst for a family.
    Analyze the following financial data for the current month and generate a report in markdown format.
    The currency is Indian Rupees (?).

    Current Month's Expenses:
    ${expensesText || "No expenses recorded for this month."}

    Monthly Budgets:
    ${budgetsText || "No budgets set for this month."}

    Please provide a report that includes the following sections:
    1.  A spending summary table. Create a markdown table with the columns: | Category | Budget | Spent | Difference |. For the 'Difference' column, show a positive value if they saved money and a negative value if they overspent.
    2.  A section titled "### Key Insights" highlighting 2-3 important observations (e.g., categories with highest spending, where they are saving well, or areas of overspending).
    3.  A section titled "### Actionable Suggestions" providing 2-3 practical tips for them to improve their finances next month based on their spending.
    
    Be encouraging and helpful in your tone.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
};

/**
 * Suggests a smart transfer amount for a bucket goal.
 * @param household - The household data.
 * @param goal - The specific goal to get a suggestion for.
 * @returns An object with the suggested amount and reasoning.
 */
export const generateTransferSuggestion = async (household: Household, goal: BucketGoal): Promise<{ amount: number; reasoning:string; }> => {
    const recentExpenses = household.expenses.filter(e => new Date(e.date) > new Date(Date.now() - 30 * 86400000));
    const totalSpentLast30Days = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBudget = household.budgets.reduce((sum, b) => sum + b.amount, 0);

    const prompt = `You are a helpful savings assistant. A user wants to save for a goal: "${goal.name}" (Target: ${formatCurrencyForPrompt(goal.targetAmount)}, Current: ${formatCurrencyForPrompt(goal.currentAmount)}).

    Here is their financial context for the last 30 days:
    - Total Monthly Budget: ${formatCurrencyForPrompt(totalBudget)}
    - Total Spent in last 30 days: ${formatCurrencyForPrompt(totalSpentLast30Days)}
    
    Based on this, suggest a "safe-to-transfer" amount they could move to their savings goal right now. This should be a sensible, non-round number that feels achievable. Also provide a short, one-sentence reasoning for your suggestion. The currency is INR.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    amount: {
                        type: Type.NUMBER,
                        description: "The suggested transfer amount as a number (e.g., 1850.50)."
                    },
                    reasoning: {
                        type: Type.STRING,
                        description: "A short, one-sentence explanation for the suggested amount."
                    }
                },
                required: ["amount", "reasoning"]
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};

export const generateBudgetSuggestions = async (household: Household): Promise<Array<{ categoryId: string; amount: number; reasoning: string }>> => {
    const expenseHistory = household.expenses
        .slice(0, 100) // last 100 expenses
        .map(e => {
            const category = household.categories.find(c => c.id === e.categoryId)?.name || 'Uncategorized';
            return `- ${e.description}: ${formatCurrencyForPrompt(e.amount)} [${category}] on ${new Date(e.date).toLocaleDateString()}`;
        }).join('\n');

    const categories = household.categories;
    const categoryInfo = categories.map(c => ({ id: c.id, name: c.name }));

    const prompt = `You are an expert financial planner creating a monthly budget for a family.
    Analyze their recent spending history to suggest a realistic monthly budget for each category.

    Expense History (last 100 transactions):
    ${expenseHistory || "No expense history available."}

    Available Categories:
    ${JSON.stringify(categoryInfo)}

    Based on the expense history, provide a suggested budget amount (in INR) for each category.
    For each suggestion, also provide a short, one-sentence reasoning. The amounts should be sensible round numbers.
    Return the result as a JSON array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        categoryId: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["categoryId", "amount", "reasoning"]
                }
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};

export const generateIncomeBasedBudget = async (
    monthlyIncome: number,
    categories: Category[]
): Promise<Array<{ categoryId: string; amount: number; reasoning: string }>> => {
    const categoryInfo = categories.map(c => ({ id: c.id, name: c.name }));
    const incomeInRupees = formatCurrencyForPrompt(monthlyIncome);

    const prompt = `You are an expert financial planner creating a starter monthly budget for a family based on their income. Their currency is INR.

    - Total Monthly Income: ?${incomeInRupees}
    - Available Spending Categories: ${JSON.stringify(categoryInfo)}

    Please create a budget plan by allocating the total income across the provided categories.
    Use the 50/30/20 rule (50% for needs, 30% for wants, 20% for savings/investing) as a general guideline, but be intelligent about it.
    - Needs-based categories are likely 'Groceries', 'Utilities', 'Transport', 'Health'.
    - Wants-based categories are likely 'Dining Out', 'Entertainment', 'Shopping'.
    - If there is no specific "Savings" category, you can allocate that portion to 'Other' or simply not allocate it.
    - Distribute the amounts logically. The sum of all suggested budget amounts should not exceed the total monthly income.
    
    For each category, provide a suggested budget amount (in INR) and a short, one-sentence reasoning for the allocation.
    Return the result as a JSON array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        categoryId: { type: Type.STRING },
                        amount: { type: Type.NUMBER, description: "The suggested budget amount in INR." },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["categoryId", "amount", "reasoning"]
                }
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};


export const detectAnomalousExpense = async (
  household: Household,
  newExpense: Expense
): Promise<{ isAnomalous: boolean; reasoning: string; }> => {
    const categoryExpenses = household.expenses.filter(e => e.categoryId === newExpense.categoryId);
    const averageAmount = categoryExpenses.length > 0
        ? categoryExpenses.reduce((sum, e) => sum + e.amount, 0) / categoryExpenses.length
        : 0;

    const expenseHistoryText = categoryExpenses.slice(0, 20).map(e => `${formatCurrencyForPrompt(e.amount)} for "${e.description}"`).join(', ');
    const newExpenseCategoryName = household.categories.find(c => c.id === newExpense.categoryId)?.name;

    const prompt = `You are a financial monitoring AI. Your job is to detect if a new transaction is unusual compared to historical spending.

    Category: "${newExpenseCategoryName}"
    Historical Spending in this Category (amounts in INR): ${expenseHistoryText || 'None'}
    Average spending in this category: ${formatCurrencyForPrompt(averageAmount)}

    New Transaction to Analyze:
    - Description: "${newExpense.description}"
    - Amount: ${formatCurrencyForPrompt(newExpense.amount)}

    Is this new transaction anomalous (unusually high or out of place)?
    Consider the amount compared to the average and the description. For example, a "car purchase" in the "Groceries" category would be anomalous.
    Provide your answer as a JSON object.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isAnomalous: { type: Type.BOOLEAN },
                    reasoning: { type: Type.STRING, description: "A short, one-sentence explanation IF it is anomalous. E.g., 'This expense is much higher than your average spending in this category.'" }
                },
                required: ["isAnomalous", "reasoning"]
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};

export const parseBankStatement = async (
    fileData: string,
    mimeType: string,
): Promise<UncategorizedTransaction[]> => {
    
    let contentPart;
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        const base64Data = fileData.split(',')[1];
        contentPart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };
    } else if (mimeType === 'text/csv' || mimeType === 'text/plain') {
        contentPart = { text: fileData };
    } else {
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    const prompt = `
        You are an expert financial data extraction tool. Analyze the provided bank or credit card statement content (which could be an image, PDF, or CSV text) and extract all transactions.
        The primary goal is to identify the date, description, and amount for each transaction.
        Also, determine if each transaction is a 'credit' (money in) or a 'debit' (money out/expense).
        - Dates can be in any format, but you must convert them to "YYYY-MM-DD". Assume the current year if the year is not specified.
        - Amounts may have currency symbols (like ?, $, etc.) or commas, which should be removed. The final amount should be a standard number (e.g., 1250.75). All amounts should be positive.
        - The 'type' should be determined based on context, such as columns labeled 'debit'/'credit', 'withdrawal'/'deposit', or the presence of a negative sign.
        - Ignore any summary rows, headers, or footers that are not actual transactions.
        
        Return the data as a JSON array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [contentPart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: {
                            type: Type.STRING,
                            description: "The transaction date in YYYY-MM-DD format."
                        },
                        description: {
                            type: Type.STRING,
                            description: "The transaction description."
                        },
                        amount: {
                            type: Type.NUMBER,
                            description: "The transaction amount as a positive number."
                        },
                        type: {
                            type: Type.STRING,
                            description: "The transaction type, either 'credit' or 'debit'."
                        }
                    },
                    required: ["date", "description", "amount", "type"]
                }
            }
        }
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
        return [];
    }
    return JSON.parse(jsonString);
};


export const categorizeTransactions = async (
    transactions: UncategorizedTransaction[],
    household: Household
): Promise<CategorizedTransaction[]> => {
    if (transactions.length === 0) {
        return [];
    }

    const categoryInfo = household.categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }));
    const rulesText = household.rules.map(r => `If description contains "${r.keyword}", the category is "${household.categories.find(c => c.id === r.categoryId)?.name}".`).join('\n');
    const descriptions = transactions.map(t => t.description);

    const prompt = `You are an intelligent financial assistant. Your task is to categorize a list of bank transactions based on the user's defined categories and auto-categorization rules.

    User's Categories:
    ${JSON.stringify(categoryInfo)}

    User's Auto-Categorization Rules (these have the highest priority):
    ${rulesText || 'No rules defined.'}

    Here are the transaction descriptions to categorize:
    ${JSON.stringify(descriptions)}

    Please return a JSON array of strings, where each string is the category ID (e.g., "cat-1") corresponding to each transaction description in the provided order. If no category fits well, use the ID for the "Other" category if it exists, otherwise pick the most reasonable one. The length of your returned array must exactly match the number of descriptions provided.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "The category ID for the transaction."
                }
            }
        }
    });

    const jsonString = response.text.trim();
    const categoryIds: string[] = JSON.parse(jsonString);

    if (categoryIds.length !== transactions.length) {
        console.error("AI Error: Mismatch in categorized transactions length. Assigning 'Other' as fallback.");
        const otherCategoryId = household.categories.find(c => c.name.toLowerCase() === 'other')?.id || household.categories[0]?.id;
        return transactions.map(t => ({ ...t, categoryId: otherCategoryId }));
    }

    return transactions.map((transaction, index) => ({
        ...transaction,
        categoryId: categoryIds[index],
    }));
};

export const detectRecurringPayments = async (household: Household): Promise<SuggestedSubscription[]> => {
    const expenseHistory = household.expenses.slice(0, 200).map(e => ({
        date: e.date.split('T')[0],
        description: e.description,
        amount: formatCurrencyForPrompt(e.amount),
        category: household.categories.find(c => c.id === e.categoryId)?.name,
    }));

    const existingSubscriptions = household.subscriptions.map(s => s.description);
    const categoryInfo = household.categories.map(c => ({ id: c.id, name: c.name }));

    const prompt = `You are a financial analyst AI. Your task is to detect potential recurring payments (subscriptions, bills) from a user's expense history.

    Analyze the provided list of expenses. Look for transactions with similar descriptions and amounts that occur at regular intervals (roughly weekly, monthly, or yearly).

    - Already known subscriptions to ignore: ${JSON.stringify(existingSubscriptions)}
    - Available categories for mapping: ${JSON.stringify(categoryInfo)}

    Expense History (last 200 transactions):
    ${JSON.stringify(expenseHistory, null, 2)}

    Based on this data, identify potential recurring payments. For each one you find, provide the most recent payment date. Return your findings as a JSON array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "A clean description for the recurring payment (e.g., 'Netflix Subscription')." },
                        amount: { type: Type.NUMBER, description: "The recurring amount in INR (e.g., 649.00)." },
                        frequency: { type: Type.STRING, description: "The estimated frequency: 'weekly', 'monthly', or 'yearly'." },
                        categoryId: { type: Type.STRING, description: "The most likely category ID from the provided list." },
                        lastPaymentDate: { type: Type.STRING, description: "The date of the most recent transaction for this recurring payment in YYYY-MM-DD format." }
                    },
                    required: ["description", "amount", "frequency", "categoryId", "lastPaymentDate"]
                }
            }
        }
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
      return [];
    }
    return JSON.parse(jsonString);
};


export const generateSavingsSuggestions = async (household: Household): Promise<SavingsSuggestion[]> => {
    const expensesLast60Days = household.expenses.filter(e => new Date(e.date) > new Date(Date.now() - 60 * 86400000));

    const expenseText = expensesLast60Days.map(e => {
        const category = household.categories.find(c => c.id === e.categoryId)?.name || 'Uncategorized';
        return `- ${formatCurrencyForPrompt(e.amount)} for "${e.description}" in [${category}] on ${new Date(e.date).toLocaleDateString()}`;
    }).join('\n');

    const budgetsText = household.budgets.map(b => {
        const category = household.categories.find(c => c.id === b.categoryId)?.name || 'Uncategorized';
        return `- ${category}: ${formatCurrencyForPrompt(b.amount)}`;
    }).join('\n');

    const categoryNames = household.categories.map(c => c.name).join(', ');

    const prompt = `You are a pragmatic and helpful financial coach. Your goal is to analyze a family's spending history for the last 60 days and identify the top 3 categories where they can realistically cut costs.

    Here is the family's financial data (currency is INR):
    - Available Categories: [${categoryNames}]
    - Monthly Budgets:
    ${budgetsText || "No budgets set."}
    - Recent Expenses (last 60 days):
    ${expenseText || "No recent expenses."}

    Based on this data, please provide 3 concrete and actionable savings suggestions. For each suggestion:
    1.  Identify a specific spending category from the available list.
    2.  Provide a short, clear reasoning based on their data (e.g., "Spending in this category is 30% over budget," or "This is the largest non-essential spending category.").
    3.  Give a specific, actionable tip. Instead of "spend less," suggest something concrete like "Try replacing two restaurant meals per week with home-cooked ones" or "Review your streaming subscriptions for cheaper plans."
    4.  Estimate the potential monthly savings in INR as a number.

    Return your response as a JSON array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        categoryName: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                        potentialSavings: { type: Type.NUMBER }
                    },
                    required: ["categoryName", "reasoning", "suggestion", "potentialSavings"]
                }
            }
        }
    });
    
    const jsonString = response.text.trim();
    if (!jsonString) {
      return [];
    }
    return JSON.parse(jsonString);
};

export const startAiChat = (household: Household): Chat => {
    // Sanitize and summarize the household data to create a concise context.
    const context = {
        members: household.members.map(m => ({ id: m.id, name: m.name })),
        categories: household.categories.map(c => ({ id: c.id, name: c.name })),
        totalMonthlyIncome: formatCurrencyForPrompt(household.monthlyIncome),
        currentMonthExpenses: household.expenses
            .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
            .map(e => ({
                description: e.description,
                amount: formatCurrencyForPrompt(e.amount),
                date: e.date.split('T')[0],
                category: household.categories.find(c => c.id === e.categoryId)?.name || 'N/A',
                paidBy: household.members.find(m => m.id === e.memberId)?.name || 'N/A',
            })),
        budgets: household.budgets.map(b => {
            const spent = household.expenses
                .filter(e => new Date(e.date).getMonth() === new Date().getMonth() && e.categoryId === b.categoryId)
                .reduce((sum, e) => sum + e.amount, 0);
            return {
                category: household.categories.find(c => c.id === b.categoryId)?.name || 'N/A',
                amount: formatCurrencyForPrompt(b.amount),
                spent: formatCurrencyForPrompt(spent),
            };
        }),
        goals: household.bucketGoals.map(g => ({
            name: g.name,
            target: formatCurrencyForPrompt(g.targetAmount),
            saved: formatCurrencyForPrompt(g.currentAmount),
        })),
        subscriptions: household.subscriptions.map(s => ({
            description: s.description,
            amount: formatCurrencyForPrompt(s.amount),
            nextDue: s.nextDueDate.split('T')[0],
        })),
    };

    const systemInstruction = `You are "FinancelyAI", a helpful and friendly AI financial assistant for a family.
    Your personality is encouraging, clear, and concise. You are not a licensed financial advisor, so you must NEVER give direct financial advice (e.g., "you should invest in X"). Instead, you analyze the user's provided data to answer their questions factually.
    The currency is Indian Rupees (INR, ?).
    Today's date is ${new Date().toLocaleDateString()}.

    Here is the family's financial summary. Use this data exclusively to answer questions. Do not invent any information.
    \`\`\`json
    ${JSON.stringify(context, null, 2)}
    \`\`\`

    When answering:
    - Keep responses brief and to the point.
    - If asked about spending, provide totals and breakdowns as requested.
    - If asked for an opinion or advice, reframe the answer to be a data-driven observation. For example, if asked "Am I spending too much on food?", you can answer "Your spending on 'Dining Out' this month is ?X, which is Y% of your total expenses. Your budget for this category is ?Z."
    - Be conversational and friendly.`;

    const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });

    return chat;
};