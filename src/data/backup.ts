import { categories } from '../domain/money'
import type { Budgets, Expense, MoneyData } from '../domain/money'
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const amount = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 999999999999
export function parseMoneyData(value: unknown): MoneyData {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.expenses) || !object(value.budgets)) throw new Error('지원하지 않는 가계부 파일입니다.')
  const ids = new Set<string>()
  const expenses: Expense[] = value.expenses.map(e => {
    if (!object(e) || typeof e.id !== 'string' || !e.id || ids.has(e.id) || typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !Number.isFinite(Date.parse(e.date)) || new Date(e.date).toISOString().slice(0, 10) !== e.date || !categories.includes(e.category as Expense['category']) || !amount(e.amount) || e.amount === 0 || typeof e.note !== 'string' || typeof e.large !== 'boolean') throw new Error('지출 데이터가 올바르지 않습니다.')
    ids.add(e.id)
    return { id: e.id, date: e.date, category: e.category as Expense['category'], amount: e.amount, note: e.note, large: e.large }
  })
  const budgets: Record<string, Budgets> = {}
  for (const [month, b] of Object.entries(value.budgets)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !object(b) || categories.some(c => !amount(b[c]))) throw new Error('예산 데이터가 올바르지 않습니다.')
    budgets[month] = Object.fromEntries(categories.map(c => [c, b[c]])) as Budgets
  }
  return { version: 1, expenses, budgets }
}
export function createBackup(data: MoneyData) {
  return JSON.stringify({ app: 'daily-money', backupVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2)
}
export function readBackup(text: string) {
  const backup: unknown = JSON.parse(text)
  if (!object(backup) || backup.app !== 'daily-money' || backup.backupVersion !== 1) throw new Error('하루 가계부 백업 파일을 선택해주세요.')
  return parseMoneyData(backup.data)
}
