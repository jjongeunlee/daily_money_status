import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
try {
 const page = await browser.newPage()
 const records = new Map()
 let user = '11111111-1111-4111-8111-111111111111', conflict = false
 await page.route('https://*.supabase.co/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname
  let body = {}, status = 200
  if (path.endsWith('/token')) body = { access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user: { id: user, email: 'one@example.com', aud: 'authenticated', role: 'authenticated' } }
  else if (path.endsWith('/logout')) body = {}
  else if (path.endsWith('/money_accounts')) { const id = new URL(req.url()).searchParams.get('user_id').slice(3); body = records.has(id) ? [records.get(id)] : [] }
  else if (path.endsWith('/save_money')) {
   const value = req.postDataJSON()
   const current = records.get(user)?.revision || 0
   if (conflict || value.expected_revision !== current) { status = 400; body = { message: 'revision_conflict', code: 'P0001' } }
   else { records.set(user, { data: value.payload, revision: current + 1 }); body = current + 1 }
  }
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
 })
 await page.goto(process.env.TEST_URL || 'http://localhost:4182/daily_money_status/')
 await page.getByLabel('이메일', { exact: true }).fill('one@example.com')
 await page.getByLabel('비밀번호', { exact: true }).fill('test-password')
 await page.getByRole('button', { name: '로그인', exact: true }).click()
 await page.getByRole('button', { name: '예산 수정' }).click()
 await page.getByLabel('식비 (원)').fill('700000')
 await page.getByRole('button', { name: '예산 저장' }).click()
 await page.locator('.modal').waitFor({ state: 'detached' })
 assert.equal(Object.values(records.get(user).data.budgets)[0]['식비'], 700000)
 for (const [note, amount] of [['점심', '15000'], ['간식', '3000']]) {
  await page.getByRole('button', { name: '＋ 지출 기록', exact: true }).filter({ visible: true }).click()
  await page.getByLabel('금액 (원)').fill(amount)
  await page.getByLabel('메모').fill(note)
  await page.getByRole('button', { name: '기록 저장', exact: true }).click()
  await page.locator('.modal').waitFor({ state: 'detached' })
 }
 const beforeEdit = structuredClone(records.get(user).data)
 await page.getByRole('button', { name: '점심 15,000원 수정', exact: true }).click()
 await page.getByLabel('메모').fill('취소할 수정')
 await page.getByRole('button', { name: '닫기', exact: true }).click()
 assert.deepEqual(records.get(user).data, beforeEdit)
 await page.getByRole('button', { name: '점심 15,000원 수정', exact: true }).click()
 const oldDate = await page.getByLabel('날짜', { exact: true }).inputValue()
 assert.equal(oldDate, beforeEdit.expenses[0].date)
 assert.equal(await page.evaluate(() => document.activeElement.id), 'dialog-title')
 const nextMonth = new Date(Number(oldDate.slice(0, 4)), Number(oldDate.slice(5, 7)), 1)
 const newDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
 await page.getByLabel('날짜', { exact: true }).fill(newDate)
 await page.getByLabel('카테고리').selectOption('육아')
 await page.getByLabel('금액 (원)').fill('45000')
 await page.getByLabel('메모').fill('아기용품')
 await page.getByLabel('큰 지출로 기록').check()
 await page.getByRole('button', { name: '수정 저장', exact: true }).click()
 await page.getByRole('button', { name: '아기용품 45,000원 수정', exact: true }).waitFor()
 const edited = records.get(user).data
 assert.equal(edited.expenses.length, 2)
 assert.deepEqual(edited.expenses[0], { ...beforeEdit.expenses[0], date: newDate, category: '육아', amount: 45000, note: '아기용품', large: true })
 assert.deepEqual(edited.expenses[1], beforeEdit.expenses[1])
 assert.deepEqual(edited.budgets, beforeEdit.budgets)
 assert.match(await page.locator('.large-card > strong').innerText(), /45,000/)
 assert.match(await page.locator('.balance h2').innerText(), /1,600,000/)
 conflict = true
 await page.getByRole('button', { name: '아기용품 45,000원 수정', exact: true }).click()
 await page.getByLabel('금액 (원)').fill('55000')
 await page.getByRole('button', { name: '수정 저장', exact: true }).click()
 await page.getByRole('alert').first().waitFor()
 assert.equal(records.get(user).data.expenses[0].amount, 45000)
 assert.equal(await page.getByLabel('금액 (원)').inputValue(), '55000')
 await page.getByRole('button', { name: '닫기', exact: true }).click()
 conflict = true
 await page.getByRole('button', { name: '예산 수정' }).click()
 await page.getByLabel('식비 (원)').fill('800000')
 await page.getByRole('button', { name: '예산 저장' }).click()
 await page.getByRole('alert').first().waitFor()
 assert.equal(Object.values(records.get(user).data.budgets)[0]['식비'], 700000)
 await page.getByRole('button', { name: '닫기' }).click()
 conflict = false
 await page.getByRole('button', { name: '예산 수정' }).click()
 await page.getByLabel('카테고리 이름 2', { exact: true }).fill('주거비')
 await page.getByRole('button', { name: '＋ 카테고리 추가', exact: true }).click()
 await page.getByLabel('카테고리 이름 5', { exact: true }).fill('교통비')
 await page.getByLabel('교통비 (원)', { exact: true }).fill('100000')
 await page.getByRole('button', { name: '예산 저장', exact: true }).click()
 await page.locator('.modal').waitFor({ state: 'detached' })
 assert.equal(records.get(user).data.categories.find(c => c.id === '생활비').name, '주거비')
 assert.equal(records.get(user).data.categories.length, 5)
 assert.equal(records.get(user).data.expenses.length, 2)
 await page.reload()
 await page.getByRole('heading', { name: '주거비', exact: true }).waitFor()
 await page.getByRole('heading', { name: '교통비', exact: true }).waitFor()
 await page.getByRole('button', { name: '로그아웃', exact: true }).click()
 user = '22222222-2222-4222-8222-222222222222'
 await page.getByLabel('이메일', { exact: true }).fill('two@example.com')
 await page.getByLabel('비밀번호', { exact: true }).fill('test-password')
 await page.getByRole('button', { name: '로그인', exact: true }).click()
 await page.getByRole('button', { name: '예산 수정' }).waitFor()
 assert.match(await page.locator('.balance h2').innerText(), /1,600,000/)
 assert.equal(records.size, 1)
 assert.equal(await page.getByRole('heading', { name: '교통비', exact: true }).count(), 0)
 await page.getByRole('heading', { name: '생활비', exact: true }).waitFor()
 console.log('PASS mocked Supabase: login, automatic save, conflict rejection, account separation. Does not validate live SQL/RLS.')
} finally { await browser.close() }
