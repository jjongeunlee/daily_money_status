import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const holidays = JSON.parse(await readFile(new URL('../src/domain/holidays.json', import.meta.url)))
for (const day of ['2026-02-16','2026-02-17','2026-02-18']) assert.ok(holidays.dates[day].includes('설날'))
assert.equal(holidays.dates['2026-02-19'], undefined)
for (const day of ['2026-09-24','2026-09-25','2026-09-26']) assert.ok(holidays.dates[day].includes('추석'))
assert.ok(holidays.dates['2026-10-05'].some(x => x.includes('대체공휴일')))
assert.ok(holidays.dates['2026-06-03'].includes('지방선거일'))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
try {
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
 const original = { version: 1, budgets: {}, expenses: [
  {id:'1',date:'2026-10-03',category:'식비',amount:10000,note:'주말 공휴일',large:false},
  {id:'2',date:'2026-10-05',category:'생활비',amount:20000,note:'대체공휴일',large:false},
  {id:'3',date:'2026-10-06',category:'식비',amount:30000,note:'평일',large:false},
  {id:'4',date:'2026-10-09',category:'육아',amount:45000,note:'한글날',large:false},
  {id:'5',date:'2026-10-06',category:'기타',amount:400000,note:'큰 지출',large:true},
  {id:'6',date:'2026-09-01',category:'식비',amount:3000,note:'지난달',large:false},
 ]}
 await page.addInitScript(data => localStorage.setItem('daily-money:v1', JSON.stringify(data)), original)
 await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'))
 await page.goto(process.env.TEST_URL || 'http://localhost:4180')
 await page.getByRole('button', { name:'분석',exact:true }).click()
 assert.match(await page.locator('.analysis-summary article').nth(0).innerText(), /105,000원/)
 assert.match(await page.locator('.analysis-summary article').nth(1).innerText(), /75,000원/)
 await page.getByLabel('분석 상세 기간').selectOption('2026-10-05')
 assert.match(await page.locator('.chart-detail').innerText(), /개천절.*대체공휴일/)
 assert.match(await page.locator('.chart-detail > strong').innerText(), /20,000원/)
 await page.getByLabel('분석 카테고리').selectOption('식비')
 assert.match(await page.locator('.analysis-summary article').nth(0).innerText(), /40,000원/)
 await page.getByLabel('분석 카테고리').selectOption('전체')
 await page.getByLabel('큰 지출 포함').check()
 assert.match(await page.locator('.analysis-summary article').nth(0).innerText(), /505,000원/)
 await page.getByLabel('큰 지출 포함').uncheck()
 await page.getByRole('button', {name:'월별',exact:true}).click()
 assert.equal(await page.locator('svg g[role=button]').count(),12)
 assert.match(await page.locator('.analysis-summary article').nth(0).innerText(), /108,000원/)
 await page.getByRole('button', {name:'이전 해',exact:true}).click()
 await page.getByText('선택한 기간과 조건에 지출 기록이 없어요.').waitFor()
 await page.getByRole('button', {name:'다음 해',exact:true}).click()
 await page.getByRole('button', {name:'일별',exact:true}).click()
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true)
 assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('daily-money:v1'))),original)
 await page.screenshot({path:'/tmp/analysis-mobile.png',fullPage:true})
 await page.getByRole('button', {name:'대시보드',exact:true}).click()
 await page.getByRole('button', {name:'평일 30,000원 수정',exact:true}).click()
 assert.equal(await page.getByLabel('날짜', {exact:true}).inputValue(),'2026-10-06')
 assert.equal(await page.evaluate(() => document.activeElement.id),'dialog-title')
 console.log('PASS analysis: daily/monthly/category totals, large-expense toggle, holiday/weekend union, Korean holiday dates, empty year, mobile layout, unchanged stored data, expense date focus')
} finally {await browser.close()}
