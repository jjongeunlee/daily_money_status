import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { moneyRepository } from './data/repository'
import type { MoneyRepository } from './data/repository'
import { categoryColors, getBudgets, getCategories, getMonthCategories, localDate, summarize } from './domain/money'
import type { Category, Expense, MoneyData } from './domain/money'
import { createBackup, readBackup } from './data/backup'
import Analytics from './Analytics'
import BudgetEditor from './BudgetEditor'
import type { Period } from './domain/analytics'
import './App.css'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
export default function App({ repository = moneyRepository, cloud = false }: { repository?: MoneyRepository; cloud?: boolean }) {
  const [tab, setTab] = useState<'dashboard' | 'analysis'>('dashboard')
  const [analysisPeriod, setAnalysisPeriod] = useState<Period>('daily')
  const [data, setData] = useState<MoneyData | null>(null)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(localDate().slice(0, 7))
  const [dialog, setDialog] = useState<'expense' | 'budget' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
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
  useEffect(() => { repository.load().then(setData).catch(e => setError(e instanceof Error ? e.message : '기록을 불러오지 못했습니다. 기존 데이터는 변경하지 않았습니다.')) }, [repository])
  useEffect(() => {
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const modal = document.querySelector<HTMLElement>('.modal')
    if (dialog === 'expense') modal?.querySelector<HTMLElement>('#dialog-title')?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modal) return
      const controls = [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary')]
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal.querySelector('#dialog-title'))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', trap); document.body.style.overflow = originalOverflow; previous?.focus() }
  }, [dialog])
  async function persist(next: MoneyData) {
    setSaving(true)
    try { await repository.save(next); setData(next); setError(''); if (cloud) setNotice('클라우드 저장 완료'); return true }
    catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해주세요.'); return false }
    finally { setSaving(false) }
  }
  function moveMonth(offset: number) {
    const [y, m] = month.split('-').map(Number)
    setMonth(localDate(new Date(y, m - 1 + offset, 1)).slice(0, 7))
  }
  function openExpense(expense?: Expense) {
    setEditingId(expense?.id ?? null)
    setDate(expense?.date ?? localDate())
    setCategory(expense?.category ?? getCategories(data).find(c => !c.archived)!.id)
    setAmount(expense ? String(expense.amount) : '')
    setNote(expense?.note ?? '')
    setLarge(expense?.large ?? false)
    setDialog('expense')
  }
  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(amount)
    if (!data || saving || !Number.isSafeInteger(value) || value <= 0 || !date) return
    const expense: Expense = { id: editingId ?? crypto.randomUUID(), date, category, amount: value, note: note.trim(), large }
    const expenses = editingId ? data.expenses.map(item => item.id === editingId ? expense : item) : [...data.expenses, expense]
    if (await persist({ ...data, expenses })) {
      setMonth(date.slice(0, 7)); setDialog(null); setAmount(''); setNote(''); setLarge(false)
    }
  }
  const definitions = getCategories(data)
  const categories = getMonthCategories(data, month).map(c => c.id)
  const categoryName = (id: string) => definitions.find(c => c.id === id)?.name ?? id
  const categoryIcon = (id: string) => ['🍽', '⌂', '✿', '⋯'][definitions.findIndex(c => c.id === id) % 4]
  const budgets = getBudgets(data, month)
  const summary = summarize(data?.expenses ?? [], month, budgets, categories)
  const days = [...new Set(summary.monthly.map(e => e.date))].sort().reverse()
  return <div className="app">
    <header className="topbar"><a className="brand" href="./"><span className="brand-icon">₩</span> 하루 가계부</a><span className="local-badge">{cloud ? '클라우드 저장' : '내 기기에 저장'}</span></header>
    <main>
      <div className="heading"><div><p className="eyebrow">MY MONTHLY WALLET</p><h1>작은 기록, 여유로운 일상</h1><p className="subtitle">오늘의 지출을 기록하고 이번 달의 여유를 확인하세요.</p></div><button className="primary desktop-add" disabled={!data} onClick={() => openExpense()}>＋ 지출 기록</button></div>
      <nav className="main-tabs" aria-label="가계부 보기"><button aria-pressed={tab === 'dashboard'} onClick={() => setTab('dashboard')}>대시보드</button><button aria-pressed={tab === 'analysis'} onClick={() => setTab('analysis')}>분석</button></nav>
      <div className="month-row"><div className="month-picker"><button aria-label={tab === 'analysis' && analysisPeriod === 'monthly' ? '이전 해' : '이전 달'} onClick={() => moveMonth(tab === 'analysis' && analysisPeriod === 'monthly' ? -12 : -1)}>‹</button><h2>{Number(month.slice(0, 4))}년 {tab === 'analysis' && analysisPeriod === 'monthly' ? '' : `${Number(month.slice(5))}월`}</h2><button aria-label={tab === 'analysis' && analysisPeriod === 'monthly' ? '다음 해' : '다음 달'} onClick={() => moveMonth(tab === 'analysis' && analysisPeriod === 'monthly' ? 12 : 1)}>›</button></div>{tab === 'dashboard' && <button className="text-button" disabled={!data} onClick={() => setDialog('budget')}>예산 수정 ↗</button>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p role="status">가계부를 불러오는 중…</p>}
      {tab === 'analysis' ? <Analytics definitions={definitions} expenses={data?.expenses ?? []} month={month} period={analysisPeriod} onPeriod={setAnalysisPeriod} /> : <>
      <section className="overview" aria-label="월별 요약"><div className="balance"><p>이번 달 남은 예산</p><h2>{won(summary.remaining)}</h2><span>{summary.remaining < 0 ? '예산을 초과했어요. 다음 지출을 점검해보세요.' : '나의 속도에 맞춰, 차근차근 관리해요.'}</span></div><div className="overview-stats"><div><span>생활 예산</span><strong>{won(summary.total)}</strong></div><div><span>사용 금액</span><strong>{won(summary.used)}</strong></div><div className="total-progress" role="progressbar" aria-label="전체 예산 사용률" aria-valuenow={Math.min(100, summary.total ? Math.round(summary.used / summary.total * 100) : 0)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, summary.total ? summary.used / summary.total * 100 : 0)}%` }} /></div></div></section>
      <section className="budget-section"><div className="section-title"><h2>카테고리별 예산</h2><span>큰 지출 제외</span></div><div className="budget-grid">{categories.map((c, index) => <article className={`budget-card category-${index % 4}`} key={c}><div className="card-top"><span className="category-icon">{categoryIcon(c)}</span><h3>{categoryName(c)}{definitions.find(item => item.id === c)?.archived && <small> · 보관</small>}</h3><span className="percentage">{budgets[c] ? Math.round(summary.spent[c] / budgets[c] * 100) : summary.spent[c] ? '초과' : 0}{budgets[c] || !summary.spent[c] ? '%' : ''}</span></div><p className="spent">{won(summary.spent[c])}<span> / {won(budgets[c])}</span></p><div className="bar"><i style={{ width: `${Math.min(100, budgets[c] ? summary.spent[c] / budgets[c] * 100 : summary.spent[c] ? 100 : 0)}%`, background: categoryColors[definitions.findIndex(item => item.id === c) % categoryColors.length] }} /></div><p className={budgets[c] - summary.spent[c] < 0 ? 'over' : 'remaining'}>{budgets[c] - summary.spent[c] < 0 ? '초과' : '잔액'} <strong>{won(Math.abs(budgets[c] - summary.spent[c]))}</strong></p></article>)}</div></section>
      <section className="large-card"><span className="large-icon">↗</span><div><h2>큰 지출은 따로</h2><p>가전, 여행 등 목돈은 생활 예산에서 제외해요.</p></div><strong>{won(summary.large)}</strong></section>
      <section className="transactions"><div className="section-title"><h2>날짜별 지출</h2><span>{summary.monthly.length}건 · 전체 {won(summary.used + summary.large)}</span></div>{days.length === 0 ? <div className="empty"><span>✎</span><h3>아직 기록한 지출이 없어요</h3><p>오늘의 첫 기록으로 가계부를 시작해보세요.</p><button className="text-button" disabled={!data} onClick={() => openExpense()}>＋ 첫 지출 기록하기</button></div> : days.map(day => <div className="day-group" key={day}><div className="day-heading"><h3>{Number(day.slice(5, 7))}월 {Number(day.slice(8))}일</h3><span>{won(summary.monthly.filter(e => e.date === day).reduce((s, e) => s + e.amount, 0))}</span></div>{summary.monthly.filter(e => e.date === day).slice().reverse().map(e => <div className="transaction" key={e.id}><button className="transaction-edit" aria-label={`${e.note || categoryName(e.category)} ${won(e.amount)} 수정`} disabled={saving} onClick={() => openExpense(e)}><span className="transaction-icon">{e.large ? '↗' : categoryIcon(e.category)}</span><span className="transaction-detail"><strong>{e.note || categoryName(e.category)}</strong><span className="transaction-category">{categoryName(e.category)}{e.large && ' · 큰 지출'}</span></span><strong className="transaction-amount">{won(e.amount)}</strong></button><button className="delete" aria-label={`${e.note || categoryName(e.category)} ${won(e.amount)} 삭제`} disabled={saving} onClick={() => { if (data && window.confirm('이 지출을 삭제할까요?')) void persist({ ...data, expenses: data.expenses.filter(item => item.id !== e.id) }) }}>×</button></div>)}</div>)}</section>
      <section className="backup-section" aria-labelledby="backup-title"><h2 id="backup-title">내 기록 백업</h2>{cloud && <p>인터넷 연결이 필요합니다. 기존 기기 기록은 로그인 없이 백업한 뒤 여기서 복원하면 내 계정으로 옮길 수 있어요.</p>}<p>모든 달의 예산과 지출을 파일로 보관하고 새 기기에서 복원하세요.</p><div className="backup-actions"><button className="primary" disabled={!data || saving} onClick={downloadBackup}>백업 파일 저장</button><button className="text-button" disabled={saving || !data} onClick={() => fileInput.current?.click()}>백업 파일 복원</button><input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="백업 파일 선택" onChange={e => { void selectBackup(e.target.files?.[0]); e.target.value = '' }} /></div><small>백업은 자동으로 만들어지지 않습니다. 파일에는 개인 지출 내역이 포함됩니다.</small>{notice && <p role="status">{notice}</p>}{restore && <div className="restore-confirm"><h3>복원할 내용을 확인해주세요</h3><p>전체 지출 {restore.expenses.length.toLocaleString()}건 · 수정한 월 예산 {Object.keys(restore.budgets).length}개월</p><p>현재 이 브라우저의 예산과 지출을 모두 교체합니다. 기존 기록을 유지하려면 먼저 백업 파일을 저장하세요.</p><div className="backup-actions"><button className="primary" disabled={saving} onClick={() => void confirmRestore()}>{saving ? '복원 중…' : '전체 기록 교체하고 복원'}</button><button className="text-button" disabled={saving} onClick={() => setRestore(null)}>취소</button></div></div>}</section>
      </>}
      <footer>{cloud ? '하루 가계부 · 변경 시 클라우드에 저장됩니다. 다른 기기의 변경은 새로고침으로 확인하세요.' : '하루 가계부 · 기록은 이 브라우저에만 보관됩니다.'}</footer>
    </main>{tab === 'dashboard' && <button className="primary mobile-add" disabled={!data} onClick={() => openExpense()}>＋ 지출 기록</button>}
    {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !saving) setDialog(null) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={e => { if (e.key === 'Escape' && !saving) setDialog(null) }}><div className="modal-heading"><h2 id="dialog-title" tabIndex={-1}>{dialog === 'expense' ? editingId ? '지출 수정' : '지출 기록' : `${Number(month.slice(5))}월 예산 수정`}</h2><button aria-label="닫기" disabled={saving} onClick={() => setDialog(null)}>×</button></div>{dialog === 'expense' ? <form onSubmit={saveExpense}><label>날짜<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label><label>카테고리<select value={category} onChange={e => setCategory(e.target.value as Category)}>{definitions.filter(c => !c.archived || c.id === category).map(c => <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (보관)' : ''}</option>)}</select></label><label>금액 (원)<input type="number" inputMode="numeric" required min="1" max="999999999999" step="1" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>메모<input maxLength={100} placeholder="어디에 사용했나요?" value={note} onChange={e => setNote(e.target.value)} /></label><label className="checkbox"><input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)} /><span>큰 지출로 기록<small>월 생활 예산에서 제외됩니다.</small></span></label><button className="primary" disabled={saving} type="submit">{saving ? '저장 중…' : editingId ? '수정 저장' : '기록 저장'}</button></form> : data && <BudgetEditor data={data} month={month} saving={saving} onSave={async next => { const saved = await persist(next); if (saved) setDialog(null); return saved }} />}{error && <p className="error" role="alert">{error}</p>}</section></div>}
  </div>
}
