export const categories = ['식비', '생활비', '육아', '기타'] as const
export type Category = string
export type Budgets = Record<string, number>
export interface CategoryDefinition { id: string; name: string; defaultBudget: number; archived: boolean }
export interface Expense { id: string; date: string; category: Category; amount: number; note: string; large: boolean }
export interface MoneyData { version: 1; expenses: Expense[]; budgets: Record<string, Budgets>; categories?: CategoryDefinition[] }
export const defaultBudgets: Budgets = { 식비: 500000, 생활비: 400000, 육아: 500000, 기타: 200000 }
export const defaultCategories: CategoryDefinition[] = categories.map(id => ({ id, name: id, defaultBudget: defaultBudgets[id], archived: false }))
export const categoryColors = ['#6d9f86', '#779cb9', '#ba92a5', '#9891ba', '#c49a63', '#72a6a5', '#bc8480', '#91a064']
export function getCategories(data: MoneyData | null) { return data?.categories ?? defaultCategories }
export function getMonthCategories(data: MoneyData | null, month: string) {
  return getCategories(data).filter(c => !c.archived || (data?.budgets[month]?.[c.id] ?? 0) > 0 || data?.expenses.some(e => e.category === c.id && e.date.startsWith(month)))
}
export function getBudgets(data: MoneyData | null, month: string): Budgets {
  const saved = data?.budgets[month]
  return Object.fromEntries(getCategories(data).map(c => [c.id, saved ? saved[c.id] ?? 0 : c.defaultBudget]))
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function summarize(expenses: Expense[], month: string, budgets: Budgets, categoryIds: string[] = [...categories]) {
  const monthly = expenses.filter(e => e.date.startsWith(month))
  const spent = Object.fromEntries(categoryIds.map(c => [c, monthly.filter(e => !e.large && e.category === c).reduce((s, e) => s + e.amount, 0)])) as Budgets
  const total = categoryIds.reduce((s, c) => s + (budgets[c] ?? 0), 0)
  const used = monthly.filter(e => !e.large).reduce((s, e) => s + e.amount, 0)
  return { monthly, spent, total, used, remaining: total - used, large: monthly.filter(e => e.large).reduce((s, e) => s + e.amount, 0) }
}
