import { categories } from '../domain/money'
import type { MoneyData } from '../domain/money'

// Replace this adapter with an API adapter to introduce cross-device synchronization.
export interface MoneyRepository {
  load(): Promise<MoneyData>
  save(data: MoneyData): Promise<void>
}
const key = 'daily-money:v1'
export class LocalMoneyRepository implements MoneyRepository {
  async load(): Promise<MoneyData> {
    const raw = localStorage.getItem(key)
    if (!raw) return { version: 1, expenses: [], budgets: {} }
    const data = JSON.parse(raw) as MoneyData
    if (data.version !== 1 || !Array.isArray(data.expenses) || !data.budgets || typeof data.budgets !== 'object') throw new Error('저장된 데이터 형식을 읽을 수 없습니다.')
    for (const e of data.expenses) {
      if (!e || typeof e.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !categories.includes(e.category) || !Number.isSafeInteger(e.amount) || e.amount <= 0 || typeof e.note !== 'string' || typeof e.large !== 'boolean') throw new Error('저장된 지출 데이터가 올바르지 않습니다.')
    }
    for (const b of Object.values(data.budgets)) {
      if (!b || categories.some(c => !Number.isSafeInteger(b[c]) || b[c] < 0)) throw new Error('저장된 예산 데이터가 올바르지 않습니다.')
    }
    return data
  }
  async save(data: MoneyData) { localStorage.setItem(key, JSON.stringify(data)) }
}
export const moneyRepository: MoneyRepository = new LocalMoneyRepository()
