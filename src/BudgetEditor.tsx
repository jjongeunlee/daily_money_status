import { useState } from 'react'
import type { FormEvent } from 'react'
import { getBudgets, getCategories } from './domain/money'
import type { CategoryDefinition, MoneyData } from './domain/money'
export default function BudgetEditor({ data, month, saving, onSave }: { data: MoneyData; month: string; saving: boolean; onSave: (data: MoneyData) => Promise<boolean> }) {
  const [draft, setDraft] = useState<CategoryDefinition[]>(() => getCategories(data).map(c => ({ ...c })))
  const [amounts, setAmounts] = useState(() => Object.fromEntries(Object.entries(getBudgets(data, month)).map(([id, n]) => [id, String(n)])))
  const [defaults, setDefaults] = useState(false)
  const [error, setError] = useState('')
  const active = draft.filter(c => !c.archived)
  function update(id: string, patch: Partial<CategoryDefinition>) { setDraft(list => list.map(c => c.id === id ? { ...c, ...patch } : c)); setError('') }
  function add() {
    const id = crypto.randomUUID()
    setDraft(list => [...list, { id, name: '', defaultBudget: 0, archived: false }])
    setAmounts(old => ({ ...old, [id]: '0' }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const names = active.map(c => c.name.trim().toLocaleLowerCase())
    if (new Set(names).size !== names.length) { setError('카테고리 이름이 겹치지 않도록 입력해주세요.'); return }
    if (active.some(c => !c.name.trim() || !Number.isSafeInteger(Number(amounts[c.id])) || Number(amounts[c.id]) < 0)) { setError('이름과 예산을 확인해주세요.'); return }
    // Keep every recorded month's previous budget before changing global defaults.
    const budgets = { ...data.budgets }
    for (const recordedMonth of new Set(data.expenses.map(e => e.date.slice(0, 7)))) {
      if (!budgets[recordedMonth]) budgets[recordedMonth] = getBudgets(data, recordedMonth)
    }
    budgets[month] = { ...getBudgets(data, month), ...Object.fromEntries(active.map(c => [c.id, Number(amounts[c.id])])) }
    for (const c of draft.filter(item => item.archived)) {
      if (!data.expenses.some(e => e.category === c.id && e.date.startsWith(month))) budgets[month][c.id] = 0
    }
    const next = draft.map(c => ({ ...c, name: c.name.trim() || '삭제한 카테고리', defaultBudget: defaults && !c.archived ? Number(amounts[c.id]) : c.defaultBudget }))
    await onSave({ ...data, categories: next, budgets })
  }
  return <form onSubmit={submit} className="budget-editor"><p className="form-hint">이름과 카테고리 목록은 모든 달에 적용됩니다. 금액은 선택한 달에 저장됩니다.</p><fieldset disabled={saving}>
    {active.map((c, index) => <div className="category-editor" key={c.id}><div className="category-editor-heading"><label>카테고리 이름<input autoFocus={index === 0} aria-label={`카테고리 이름 ${index + 1}`} value={c.name} required maxLength={30} placeholder="예: 교통비, 취미" onChange={e => update(c.id, { name: e.target.value })} /></label><button type="button" className="category-remove" aria-label={`${c.name || '새 카테고리'} 카테고리 삭제`} disabled={active.length <= 1} onClick={() => { if (window.confirm('카테고리를 목록에서 삭제할까요? 기존 지출은 삭제되지 않고 분석에도 포함됩니다.')) update(c.id, { archived: true }) }}>삭제</button></div><label>{c.name || '새 카테고리'} (원)<input aria-label={`${c.name || '새 카테고리'} (원)`} type="number" inputMode="numeric" required min="0" max="999999999999" step="1" value={amounts[c.id] ?? '0'} onChange={e => setAmounts(old => ({ ...old, [c.id]: e.target.value }))} /></label></div>)}
    <button type="button" className="add-category" disabled={draft.length >= 50} onClick={add}>＋ 카테고리 추가</button>
    <label className="checkbox"><input type="checkbox" checked={defaults} onChange={e => setDefaults(e.target.checked)} /><span>이 금액을 기본 예산으로도 사용<small>예산·지출 기록이 없는 달에도 적용됩니다.</small></span></label>
    {draft.some(c => c.archived) && <details className="archived-categories"><summary>삭제한 카테고리 관리</summary><p className="form-hint">기존 지출이 있는 달에는 보관된 카테고리로 표시됩니다.</p>{draft.filter(c => c.archived).map(c => <div key={c.id}><span>{c.name || '이름 없음'}</span><button type="button" className="text-button" onClick={() => update(c.id, { archived: false })}>{c.name || '카테고리'} 다시 사용</button></div>)}</details>}
    {error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={saving} type="submit">{saving ? '저장 중…' : '예산 저장'}</button>
  </fieldset></form>
}
