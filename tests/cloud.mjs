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
 conflict = true
 await page.getByRole('button', { name: '예산 수정' }).click()
 await page.getByLabel('식비 (원)').fill('800000')
 await page.getByRole('button', { name: '예산 저장' }).click()
 await page.getByRole('alert').first().waitFor()
 assert.equal(Object.values(records.get(user).data.budgets)[0]['식비'], 700000)
 await page.getByRole('button', { name: '닫기' }).click()
 await page.getByRole('button', { name: '로그아웃', exact: true }).click()
 user = '22222222-2222-4222-8222-222222222222'
 await page.getByLabel('이메일', { exact: true }).fill('two@example.com')
 await page.getByLabel('비밀번호', { exact: true }).fill('test-password')
 await page.getByRole('button', { name: '로그인', exact: true }).click()
 await page.getByRole('button', { name: '예산 수정' }).waitFor()
 assert.match(await page.locator('.balance h2').innerText(), /1,600,000/)
 assert.equal(records.size, 1)
 console.log('PASS mocked Supabase: login, automatic save, conflict rejection, account separation. Does not validate live SQL/RLS.')
} finally { await browser.close() }
