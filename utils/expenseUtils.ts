import { Rule, Category } from '../types';

export const suggestCategory = (description: string, rules: Rule[], categories: Category[]): string | undefined => {
  const lowercasedDescription = description.toLowerCase();
  for (const rule of rules) {
    if (lowercasedDescription.includes(rule.keyword.toLowerCase())) {
      return rule.categoryId;
    }
  }
  return undefined;
};
