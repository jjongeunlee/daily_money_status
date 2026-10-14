import { useMemo, useState } from 'react'
import { categoryColors } from './domain/money'
import type { Category, CategoryDefinition, Expense } from './domain/money'
import { calendarRange, categoryTotals, trend } from './domain/analytics'
import type { Period } from './domain/analytics'
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const colors = categoryColors
export default function Analytics({ definitions, expenses, month, period, onPeriod }: { definitions: CategoryDefinition[]; expenses: Expense[]; month: string; period: Period; onPeriod: (p: Period) => void }) {
  const categories = definitions.map(c => c.id)
  const categoryName = (id: string) => definitions.find(c => c.id === id)?.name ?? id
  const [category, setCategory] = useState<Category | '전체'>('전체')
  const [includeLarge, setIncludeLarge] = useState(false)
  const [selected, setSelected] = useState('')
  const buckets = useMemo(() => trend(expenses, month, period, category, includeLarge), [expenses, month, period, category, includeLarge])
  const total = buckets.reduce((s, b) => s + b.total, 0)
  const offTotal = buckets.reduce((s, b) => s + b.offTotal, 0)
  const totals = categoryTotals(buckets, categories)
  const peak = buckets.reduce((a, b) => b.total > a.total ? b : a)
  const detail = buckets.find(b => b.key === selected) ?? peak
  const maximum = Math.max(1, ...buckets.map(b => b.total))
  const step = 660 / buckets.length
  return <section className="analytics" aria-label="지출 분석">
    <div className="analysis-controls"><div className="period-switch" aria-label="분석 단위"><button aria-pressed={period === 'daily'} onClick={() => onPeriod('daily')}>일별</button><button aria-pressed={period === 'monthly'} onClick={() => onPeriod('monthly')}>월별</button></div><label>카테고리 <select aria-label="분석 카테고리" value={category} onChange={e => setCategory(e.target.value as Category | '전체')}><option>전체</option>{categories.map(c => <option key={c} value={c}>{categoryName(c)}</option>)}</select></label><label className="analysis-checkbox"><input type="checkbox" checked={includeLarge} onChange={e => setIncludeLarge(e.target.checked)} />큰 지출 포함</label></div>
    <div className="analysis-summary"><article><span>{period === 'daily' ? '이번 달' : '선택한 해'} 지출</span><strong>{won(total)}</strong></article><article><span>주말·공휴일 지출</span><strong>{won(offTotal)}</strong><small>전체의 {total ? Math.round(offTotal / total * 100) : 0}% · 겹치는 날은 한 번만</small></article><article><span>가장 많이 쓴 {period === 'daily' ? '날' : '달'}</span><strong>{total ? peak.label : '기록 없음'}</strong><small>{total ? won(peak.total) : '첫 기록을 기다리고 있어요'}</small></article></div>
    <section className="chart-card"><div className="section-title"><h2>{period === 'daily' ? '일별' : '월별'} 지출 흐름</h2><span>{period === 'daily' ? month.replace('-', '년 ') + '월' : month.slice(0, 4) + '년'}</span></div><p className="analysis-hint">그래프를 좌우로 밀어보고 막대를 눌러 세부 금액을 확인하세요.{period === 'daily' && ' 연한 배경은 주말·공휴일입니다.'}</p>
      <div className="chart-legend">{categories.map((c, i) => <span key={c}><i style={{ background: colors[i % colors.length] }} />{categoryName(c)}</span>)}{period === 'daily' && <span><i className="off-swatch" />주말·공휴일</span>}</div>
      {total === 0 && <p className="analysis-empty">선택한 기간과 조건에 지출 기록이 없어요.</p>}
      <div className={`chart-scroll ${period}`}><svg className="trend-chart" viewBox="0 0 760 265" aria-label="기간별 카테고리 지출 막대 그래프">
        {[0, 1, 2, 3].map(i => <g key={i}><line x1="78" x2="744" y1={210 - i * 60} y2={210 - i * 60} stroke="#e4eae6" /><text x="68" y={214 - i * 60} textAnchor="end" className="chart-label">{Math.round(maximum * i / 3).toLocaleString('ko-KR')}</text></g>)}
        {buckets.map((b, index) => { const x = 80 + index * step; let bottom = 210; return <g key={b.key} role="button" tabIndex={0} aria-label={`${b.label} ${won(b.total)} ${b.holidayNames.join(', ')}${b.weekend ? ' 주말' : ''}`} aria-pressed={detail.key === b.key} onClick={() => setSelected(b.key)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(b.key) } }}>
          <title>{b.key}: {won(b.total)}{b.holidayNames.length ? ` · ${b.holidayNames.join(', ')}` : b.weekend ? ' · 주말' : ''}</title>
          <rect x={x} y="20" width={step - 2} height="216" rx="3" fill={b.weekend || b.holidayNames.length ? '#fbf0e0' : 'transparent'} stroke={detail.key === b.key ? '#6d8b7e' : 'none'} />
          {categories.map((c, ci) => { const height = (b.amounts[c] ?? 0) / maximum * 180; bottom -= height; return <rect key={c} x={x + 3} y={bottom} width={step - 8} height={height} fill={colors[ci % colors.length]} pointerEvents="none" /> })}
          <text x={x + (step - 2) / 2} y="229" textAnchor="middle" className="chart-label" fill={b.weekend || b.holidayNames.length ? '#ad683d' : '#657c70'}>{index + 1}</text>
          {b.holidayNames.length > 0 && <text x={x + (step - 2) / 2} y="250" textAnchor="middle" fill="#ad683d" fontSize="10">●</text>}
        </g> })}
      </svg></div>
      <div className="chart-detail"><label>상세 {period === 'daily' ? '날짜' : '월'}<select aria-label="분석 상세 기간" value={detail.key} onChange={e => setSelected(e.target.value)}>{buckets.map(b => <option key={b.key} value={b.key}>{b.label}{b.holidayNames.length ? ` · ${b.holidayNames.join(', ')}` : b.weekend ? ' · 주말' : ''}</option>)}</select></label><strong>{won(detail.total)}</strong><p>{detail.holidayNames.length ? detail.holidayNames.join(' · ') : detail.weekend ? '주말' : period === 'daily' ? '평일' : '월 합계'}{period === 'monthly' && ` · 주말·공휴일 ${won(detail.offTotal)}`}</p><div className="detail-categories">{categories.map((c, i) => <span key={c}><i style={{ background: colors[i % colors.length] }} />{categoryName(c)} <b>{won(detail.amounts[c] ?? 0)}</b></span>)}</div></div>
    </section>
    <section className="chart-card"><h2>카테고리별 지출</h2><div className="category-analysis">{categories.map((c, i) => <div key={c}><span>{categoryName(c)}</span><div className="bar"><i style={{ width: `${total ? totals[c] / total * 100 : 0}%`, background: colors[i % colors.length] }} /></div><strong>{won(totals[c])}</strong><small>{total ? Math.round(totals[c] / total * 100) : 0}%</small></div>)}</div></section>
    <p className="analysis-hint">한국 공휴일 기준 · 토·일요일 및 대체공휴일 포함. {calendarRange.from}–{calendarRange.to}년 달력을 제공합니다. 임시공휴일·선거일은 새로 지정되면 업데이트가 필요할 수 있어요.</p>
  </section>
}
