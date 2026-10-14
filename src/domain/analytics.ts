import type { Budgets, Category, Expense } from './money'
import calendar from './holidays.json'
export type Period = 'daily' | 'monthly'
export interface Bucket { key: string; label: string; amounts: Budgets; total: number; offTotal: number; holidayNames: string[]; weekend: boolean }
export function dayInfo(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  const names = (calendar.dates as Record<string, string[]>)[date] ?? []
  return { weekend: weekday === 0 || weekday === 6, names, off: weekday === 0 || weekday === 6 || names.length > 0 }
}
export function trend(expenses: Expense[], month: string, period: Period, category: Category | '전체', includeLarge: boolean): Bucket[] {
  const [year, m] = month.split('-').map(Number)
  const count = period === 'daily' ? new Date(year, m, 0).getDate() : 12
  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
    const key = period === 'daily' ? `${month}-${String(i + 1).padStart(2, '0')}` : `${year}-${String(i + 1).padStart(2, '0')}`
    const info = period === 'daily' ? dayInfo(key) : { weekend: false, names: [] }
    return { key, label: `${i + 1}${period === 'daily' ? '일' : '월'}`, amounts: Object.create(null) as Budgets, total: 0, offTotal: 0, holidayNames: info.names, weekend: info.weekend }
  })
  const indexed = new Map(buckets.map(b => [b.key, b]))
  for (const expense of expenses) {
    if ((!includeLarge && expense.large) || (category !== '전체' && expense.category !== category)) continue
    const bucket = indexed.get(expense.date.slice(0, period === 'daily' ? 10 : 7))
    if (!bucket) continue
    bucket.amounts[expense.category] = (bucket.amounts[expense.category] ?? 0) + expense.amount
    bucket.total += expense.amount
    if (dayInfo(expense.date).off) bucket.offTotal += expense.amount
  }
  return buckets
}
export function categoryTotals(buckets: Bucket[], categories: string[]) {
  return Object.fromEntries(categories.map(c => [c, buckets.reduce((sum, b) => sum + (b.amounts[c] ?? 0), 0)])) as Budgets
}
export const calendarRange = { from: calendar.from, to: calendar.to }
