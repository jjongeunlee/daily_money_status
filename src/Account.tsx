import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CloudMoneyRepository, supabase } from './data/cloud'
import { moneyRepository } from './data/repository'
import App from './App'
export default function Account() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [local, setLocal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [signup, setSignup] = useState(false)
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data, error }) => { if (active) { setSession(data.session); setReady(true); if (error) setMessage('로그인 상태를 확인하지 못했습니다.') } })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true) })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  const userId = session?.user.id
  const repository = useMemo(() => userId ? new CloudMoneyRepository(userId) : moneyRepository, [userId])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    try {
      const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}` } }) : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) setMessage(signup ? '가입하지 못했습니다. 이메일과 비밀번호를 확인하고 잠시 후 다시 시도해주세요.' : '로그인하지 못했습니다. 이메일 확인과 비밀번호를 확인해주세요.')
      else if (signup && !result.data.session) setMessage('이메일의 확인 링크를 누른 뒤 이 화면에서 로그인해주세요. 메일이 없으면 스팸함도 확인해주세요.')
    } catch { setMessage('인터넷 연결을 확인해주세요.') }
    finally { setBusy(false) }
  }
  if (!ready) return <main><p role="status">로그인 상태 확인 중…</p></main>
  if (!supabase || session || local) return <><div className="account-bar">{session ? <><span>{session.user.email} · 클라우드 저장</span><button disabled={busy} onClick={async () => { setBusy(true); const result = await supabase!.auth.signOut({ scope: 'local' }); if (result.error) setMessage('로그아웃하지 못했습니다. 다시 시도해주세요.'); setBusy(false) }}>로그아웃</button></> : <><span>이 기기에만 저장</span>{supabase && <button onClick={() => setLocal(false)}>클라우드 로그인</button>}</>}</div>{message && <p className="error" role="alert">{message}</p>}<App key={session?.user.id || 'local'} repository={repository} cloud={!!session} /></>
  return <main className="login"><span className="brand-icon">₩</span><h1>나의 하루 가계부</h1><p>로그인하면 내 예산과 지출이 자동으로 클라우드에 저장됩니다. 각자의 계정으로 사용하세요.</p><form onSubmit={submit}><label>이메일<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>비밀번호<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="primary" disabled={busy}>{busy ? '처리 중…' : signup ? '회원가입' : '로그인'}</button></form>{message && <p role="status">{message}</p>}<button className="text-button" onClick={() => { setSignup(!signup); setMessage('') }}>{signup ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 회원가입'}</button><button className="text-button" onClick={() => setLocal(true)}>로그인 없이 기존 기기 기록 보기</button></main>
}
