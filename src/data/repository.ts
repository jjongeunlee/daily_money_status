import { parseMoneyData } from './backup'
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
    return parseMoneyData(JSON.parse(raw))
  }

  async save(data: MoneyData) { localStorage.setItem(key, JSON.stringify(data)) }
}
export const moneyRepository: MoneyRepository = new LocalMoneyRepository()
