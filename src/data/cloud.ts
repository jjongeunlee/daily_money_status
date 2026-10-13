import { createClient } from '@supabase/supabase-js'
import { parseMoneyData } from './backup'
import type { MoneyData } from '../domain/money'
import type { MoneyRepository } from './repository'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
export class CloudMoneyRepository implements MoneyRepository {
  private revision = 0
  private userId: string
  constructor(userId: string) { this.userId = userId }
  async load(): Promise<MoneyData> {
    if (!supabase) throw new Error('클라우드 연결 설정이 없습니다.')
    const { data, error } = await supabase.from('money_accounts').select('data, revision').eq('user_id', this.userId).maybeSingle()
    if (error) throw new Error('클라우드 기록을 읽지 못했습니다. 인터넷 연결과 데이터베이스 설정을 확인해주세요.')
    this.revision = data?.revision ?? 0
    return data ? parseMoneyData(data.data) : { version: 1, expenses: [], budgets: {} }
  }
  async save(data: MoneyData) {
    if (!supabase) throw new Error('클라우드 연결 설정이 없습니다.')
    const { data: revision, error } = await supabase.rpc('save_money', { payload: data, expected_revision: this.revision })
    if (error) {
      if (error.message.includes('revision_conflict')) throw new Error('다른 기기에서 기록이 변경되었습니다. 입력 내용을 보관한 뒤 새로고침하고 다시 기록해주세요.')
      throw new Error('클라우드에 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 저장해주세요. 입력 내용은 아직 저장되지 않았습니다.')
    }
    this.revision = revision
  }
}
