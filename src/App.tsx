import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { moneyRepository } from './data/repository'
import { categories, defaultBudgets, localDate, summarize } from './domain/money'
import type { Budgets, Category, MoneyData } from './domain/money'
import { createBackup, readBackup } from './data/backup'
import './App.css'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
export default function App() {
  const [data, setData] = useState<MoneyData | null>(null)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const [dialog, setDialog] = useState<'expense' | 'budget' | null>(null)
  const [date, setDate] = useState(localDate())
  const [category, setCategory] = useState<Category>('식비')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [large, setLarge] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [restore, setRestore] = useState<MoneyData | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  function downloadBackup() {
    if (!data) return
    const url = URL.createObjectURL(new Blob([createBackup(data)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `하루가계부-백업-${localDate()}.json`
    document.body.append(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    setNotice('백업 파일을 내려받습니다. 파일 앱 또는 다운로드 목록에서 확인해주세요.')
  }
  async function selectBackup(file?: File) {
    if (!file) return
    setRestore(null); setNotice('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('파일이 너무 큽니다. 10MB 이하의 백업을 선택해주세요.')
      setRestore(readBackup(await file.text())); setError('')
    } catch (e) { setError(e instanceof SyntaxError ? '파일을 읽을 수 없습니다. JSON 백업 파일을 선택해주세요.' : e instanceof Error ? e.message : '백업 파일을 읽지 못했습니다.') }
  }
  async function confirmRestore() {
    if (!restore) return
    if (await persist(restore)) { setRestore(null); setNotice('전체 예산과 지출을 복원했습니다.'); setMonth(localDate().slice(0, 7)) }
  }
  useEffect(() => { moneyRepository.load().then(setData).catch(() => setError('데이터를 불러오지 못했습니다. 브라우저 저장소 설정을 확인해주세요. 기존 데이터는 변경하지 않았습니다.')) }, [])
  useEffect(() => {
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const modal = document.querySelector<HTMLElement>('.modal')
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modal) return
      const controls = [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input, select')]
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', trap); document.body.style.overflow = originalOverflow; previous?.focus() }
  }, [dialog])
  async function persist(next: MoneyData) {
    setSaving(true)
    try { await moneyRepository.save(next); setData(next); setError(''); return true }
    catch { setError('저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해주세요.'); return false }
    finally { setSaving(false) }
  }
  function moveMonth(offset: number) {
    const [y, m] = month.split('-').map(Number)
    setMonth(localDate(new Date(y, m - 1 + offset, 1)).slice(0, 7))
  }
  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(amount)
    if (!data || !Number.isSafeInteger(value) || value <= 0 || !date) return
    if (await persist({ ...data, expenses: [...data.expenses, { id: crypto.randomUUID(), date, category, amount: value, note: note.trim(), large }] })) {
      setMonth(date.slice(0, 7)); setDialog(null); setAmount(''); setNote(''); setLarge(false)
    }
  }
  async function saveBudgets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    const form = new FormData(event.currentTarget)
    const budgets = Object.fromEntries(categories.map(c => [c, Number(form.get(c))])) as Budgets
    if (categories.some(c => !Number.isSafeInteger(budgets[c]) || budgets[c] < 0)) return
    if (await persist({ ...data, budgets: { ...data.budgets, [month]: budgets } })) setDialog(null)
  }
  const budgets = data?.budgets[month] ?? defaultBudgets
  const summary = summarize(data?.expenses ?? [], month, budgets)
  const days = [...new Set(summary.monthly.map(e => e.date))].sort().reverse()
  return <div className="app">
    <header className="topbar"><a className="brand" href="./"><span className="brand-icon">₩</span> 하루 가계부</a><span className="local-badge">내 기기에 저장</span></header>
    <main>
      <div className="heading"><div><p className="eyebrow">MY MONTHLY WALLET</p><h1>작은 기록, 여유로운 일상</h1><p className="subtitle">오늘의 지출을 기록하고 이번 달의 여유를 확인하세요.</p></div><button className="primary desktop-add" disabled={!data} onClick={() => setDialog('expense')}>＋ 지출 기록</button></div>
      <div className="month-row"><div className="month-picker"><button aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</button><h2>{Number(month.slice(0, 4))}년 {Number(month.slice(5))}월</h2><button aria-label="다음 달" onClick={() => moveMonth(1)}>›</button></div><button className="text-button" disabled={!data} onClick={() => setDialog('budget')}>예산 수정 ↗</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p role="status">가계부를 불러오는 중…</p>}
      <section className="overview" aria-label="월별 요약"><div className="balance"><p>이번 달 남은 예산</p><h2>{won(summary.remaining)}</h2><span>{summary.remaining < 0 ? '예산을 초과했어요. 다음 지출을 점검해보세요.' : '나의 속도에 맞춰, 차근차근 관리해요.'}</span></div><div className="overview-stats"><div><span>생활 예산</span><strong>{won(summary.total)}</strong></div><div><span>사용 금액</span><strong>{won(summary.used)}</strong></div><div className="total-progress" role="progressbar" aria-label="전체 예산 사용률" aria-valuenow={Math.min(100, summary.total ? Math.round(summary.used / summary.total * 100) : 0)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, summary.total ? summary.used / summary.total * 100 : 0)}%` }} /></div></div></section>
      <section className="budget-section"><div className="section-title"><h2>카테고리별 예산</h2><span>큰 지출 제외</span></div><div className="budget-grid">{categories.map((c, index) => <article className={`budget-card category-${index}`} key={c}><div className="card-top"><span className="category-icon">{['🍽', '⌂', '✿', '⋯'][index]}</span><h3>{c}</h3><span className="percentage">{budgets[c] ? Math.round(summary.spent[c] / budgets[c] * 100) : summary.spent[c] ? '초과' : 0}{budgets[c] || !summary.spent[c] ? '%' : ''}</span></div><p className="spent">{won(summary.spent[c])}<span> / {won(budgets[c])}</span></p><div className="bar"><i style={{ width: `${Math.min(100, budgets[c] ? summary.spent[c] / budgets[c] * 100 : summary.spent[c] ? 100 : 0)}%` }} /></div><p className={budgets[c] - summary.spent[c] < 0 ? 'over' : 'remaining'}>{budgets[c] - summary.spent[c] < 0 ? '초과' : '잔액'} <strong>{won(Math.abs(budgets[c] - summary.spent[c]))}</strong></p></article>)}</div></section>
      <section className="large-card"><span className="large-icon">↗</span><div><h2>큰 지출은 따로</h2><p>가전, 여행 등 목돈은 생활 예산에서 제외해요.</p></div><strong>{won(summary.large)}</strong></section>
      <section className="transactions"><div className="section-title"><h2>날짜별 지출</h2><span>{summary.monthly.length}건 · 전체 {won(summary.used + summary.large)}</span></div>{days.length === 0 ? <div className="empty"><span>✎</span><h3>아직 기록한 지출이 없어요</h3><p>오늘의 첫 기록으로 가계부를 시작해보세요.</p><button className="text-button" disabled={!data} onClick={() => setDialog('expense')}>＋ 첫 지출 기록하기</button></div> : days.map(day => <div className="day-group" key={day}><div className="day-heading"><h3>{Number(day.slice(5, 7))}월 {Number(day.slice(8))}일</h3><span>{won(summary.monthly.filter(e => e.date === day).reduce((s, e) => s + e.amount, 0))}</span></div>{summary.monthly.filter(e => e.date === day).slice().reverse().map(e => <div className="transaction" key={e.id}><span className="transaction-icon">{e.large ? '↗' : ['🍽', '⌂', '✿', '⋯'][categories.indexOf(e.category)]}</span><div><strong>{e.note || e.category}</strong><p>{e.category}{e.large && ' · 큰 지출'}</p></div><strong className="transaction-amount">{won(e.amount)}</strong><button className="delete" aria-label={`${e.note || e.category} ${won(e.amount)} 삭제`} disabled={saving} onClick={() => { if (data && window.confirm('이 지출을 삭제할까요?')) void persist({ ...data, expenses: data.expenses.filter(item => item.id !== e.id) }) }}>×</button></div>)}</div>)}</section>
      <section className="backup-section" aria-labelledby="backup-title"><h2 id="backup-title">내 기록 백업</h2><p>모든 달의 예산과 지출을 파일로 보관하고 새 기기에서 복원하세요.</p><div className="backup-actions"><button className="primary" disabled={!data || saving} onClick={downloadBackup}>백업 파일 저장</button><button className="text-button" disabled={saving} onClick={() => fileInput.current?.click()}>백업 파일 복원</button><input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="백업 파일 선택" onChange={e => { void selectBackup(e.target.files?.[0]); e.target.value = '' }} /></div><small>백업은 자동으로 만들어지지 않습니다. 파일에는 개인 지출 내역이 포함됩니다.</small>{notice && <p role="status">{notice}</p>}{restore && <div className="restore-confirm"><h3>복원할 내용을 확인해주세요</h3><p>전체 지출 {restore.expenses.length.toLocaleString()}건 · 수정한 월 예산 {Object.keys(restore.budgets).length}개월</p><p>현재 이 브라우저의 예산과 지출을 모두 교체합니다. 기존 기록을 유지하려면 먼저 백업 파일을 저장하세요.</p><div className="backup-actions"><button className="primary" disabled={saving} onClick={() => void confirmRestore()}>{saving ? '복원 중…' : '전체 기록 교체하고 복원'}</button><button className="text-button" disabled={saving} onClick={() => setRestore(null)}>취소</button></div></div>}</section>
      <footer>하루 가계부 · 기록은 이 브라우저에만 보관됩니다.</footer>
    </main><button className="primary mobile-add" disabled={!data} onClick={() => setDialog('expense')}>＋ 지출 기록</button>
    {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !saving) setDialog(null) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={e => { if (e.key === 'Escape' && !saving) setDialog(null) }}><div className="modal-heading"><h2 id="dialog-title">{dialog === 'expense' ? '지출 기록' : `${Number(month.slice(5))}월 예산 수정`}</h2><button aria-label="닫기" disabled={saving} onClick={() => setDialog(null)}>×</button></div>{dialog === 'expense' ? <form onSubmit={addExpense}><label>날짜<input autoFocus type="date" required value={date} onChange={e => setDate(e.target.value)} /></label><label>카테고리<select value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>금액 (원)<input type="number" inputMode="numeric" required min="1" max="999999999999" step="1" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>메모<input maxLength={100} placeholder="어디에 사용했나요?" value={note} onChange={e => setNote(e.target.value)} /></label><label className="checkbox"><input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)} /><span>큰 지출로 기록<small>월 생활 예산에서 제외됩니다.</small></span></label><button className="primary" disabled={saving} type="submit">{saving ? '저장 중…' : '기록 저장'}</button></form> : <form onSubmit={saveBudgets}>{categories.map((c, i) => <label key={c}>{c} (원)<input autoFocus={i === 0} name={c} type="number" inputMode="numeric" min="0" max="999999999999" step="1" required defaultValue={budgets[c]} /></label>)}<p className="form-hint">선택한 달에만 적용됩니다. 다른 달은 기본 예산을 사용합니다.</p><button className="primary" disabled={saving} type="submit">{saving ? '저장 중…' : '예산 저장'}</button></form>}{error && <p className="error" role="alert">{error}</p>}</section></div>}
  </div>
}
