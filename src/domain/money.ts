export const categories = ['식비', '생활비', '육아', '기타'] as const
export type Category = typeof categories[number]
export type Budgets = Record<Category, number>
export interface Expense { id: string; date: string; category: Category; amount: number; note: string; large: boolean }
export interface MoneyData { version: 1; expenses: Expense[]; budgets: Record<string, Budgets> }
export const defaultBudgets: Budgets = { 식비: 500000, 생활비: 400000, 육아: 500000, 기타: 200000 }
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function summarize(expenses: Expense[], month: string, budgets: Budgets) {
  const monthly = expenses.filter(e => e.date.startsWith(month))
  const spent = Object.fromEntries(categories.map(c => [c, monthly.filter(e => !e.large && e.category === c).reduce((s, e) => s + e.amount, 0)])) as Budgets
  const total = categories.reduce((s, c) => s + budgets[c], 0)
  const used = categories.reduce((s, c) => s + spent[c], 0)
  return { monthly, spent, total, used, remaining: total - used, large: monthly.filter(e => e.large).reduce((s, e) => s + e.amount, 0) }
}
