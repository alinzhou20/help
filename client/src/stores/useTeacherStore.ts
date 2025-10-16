import { defineStore } from 'pinia'
import { emit } from '@/utils/realtime'

const K_TEACHER_LOCK = 'va_teacher_lock'
const K_TEACHER_SESSION = 'va_teacher_session'

interface Lock { by: string; at: number }
interface SessionState { logged: boolean }

function now() { return Date.now() }
function readJSON<T>(k: string, def: T): T { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return def } }
function writeJSON(k: string, v: any) { localStorage.setItem(k, JSON.stringify(v)) }

function getLockerId() {
  const k = 'va_teacher_locker_id'
  let id = localStorage.getItem(k)
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem(k, id) }
  return id
}

export const useTeacherStore = defineStore('teacher', {
  state: () => ({
    lockerId: getLockerId(),
    locks: readJSON<Record<string, Lock>>(K_TEACHER_LOCK, {}),
    session: readJSON<SessionState>(K_TEACHER_SESSION, { logged: false }),
  }),
  actions: {
    refreshLocks() { this.locks = readJSON<Record<string, Lock>>(K_TEACHER_LOCK, {}) },
    isLoggedIn(): boolean {
      const l = this.locks['teacher']
      return !!l && l.by === this.lockerId && this.session.logged === true
    },
    canLogin(): { ok: boolean; reason?: string } {
      const l = this.locks['teacher']
      if (!l || l.by === this.lockerId) return { ok: true }
      return { ok: false, reason: '教师端已在其他窗口登录，请先退出。' }
    },
    atomicAcquire(): boolean {
      const latest = readJSON<Record<string, Lock>>(K_TEACHER_LOCK, {})
      const l = latest['teacher']
      if (l && l.by !== this.lockerId) return false
      latest['teacher'] = { by: this.lockerId, at: now() }
      writeJSON(K_TEACHER_LOCK, latest)
      this.locks = latest
      return true
    },
    release() {
      const latest = readJSON<Record<string, Lock>>(K_TEACHER_LOCK, {})
      if (latest['teacher'] && latest['teacher'].by === this.lockerId) delete latest['teacher']
      writeJSON(K_TEACHER_LOCK, latest)
      this.locks = latest
    },
    login(password: string) {
      this.refreshLocks()
      const chk = this.canLogin()
      if (!chk.ok) throw new Error(chk.reason)
      if (password !== '123456') throw new Error('密码错误')
      if (!this.atomicAcquire()) throw new Error('教师端已在其他窗口登录')
      this.session.logged = true
      writeJSON(K_TEACHER_SESSION, this.session)
    },
    logout() {
      this.release()
      this.session.logged = false
      writeJSON(K_TEACHER_SESSION, this.session)
      
      // 清除保存的代码和 codeInfo
      localStorage.removeItem('va_teacher_demo_code')
      localStorage.removeItem('va_teacher_demo_codeInfo')
      
      // 发送教师退出事件，清除服务器端保存的下发内容
      emit({ type: 'teacher:logout' })
    },
    // 自动续登（仅在本会话仍持有锁时）
    autoRelogin() {
      const l = this.locks['teacher']
      if (!l) return
      if (l.by !== this.lockerId) {
        this.session.logged = false
        writeJSON(K_TEACHER_SESSION, this.session)
        return
      }
      this.session.logged = true
      writeJSON(K_TEACHER_SESSION, this.session)
    }
  }
})
