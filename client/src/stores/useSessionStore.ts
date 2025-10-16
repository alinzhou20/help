import { defineStore } from 'pinia'
import { emit, subscribe } from '@/utils/realtime'
import { ref, reactive, watch } from 'vue'

// Storage keys
const K_SESSION = 'va_session_current'
const K_LOCKS = 'va_session_locks'
const K_LOCKER = 'va_session_locker'

// Types
export type TabKey = 'activity1' | 'activity2' | 'activity3' | 'activity4'
export interface GroupLock { by: string; at: number }

interface PersistedState {
  groupId: number | null
  currentTab: TabKey
  role: 'recorder' | 'operator' | null
  // records per group
  recordsByGroup: Record<string, Record<string, any>>
}

function now() { return Date.now() }

function readJSON<T>(k: string, def: T): T {
  try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : def } catch { return def }
}
function writeJSON<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

function getLockerId(): string {
  // 改为使用 localStorage 以支持关闭浏览器后仍能保持登录
  let id = localStorage.getItem(K_LOCKER)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    try { localStorage.setItem(K_LOCKER, id) } catch {}
  }
  return id
}

export const useSessionStore = defineStore('session', () => {
  // locker id for this browser session
  const lockerId = getLockerId()

  // Locks shared across tabs (and browsers on same device/origin)
  const locks = ref<Record<string, GroupLock>>(readJSON<Record<string, GroupLock>>(K_LOCKS, {}))
  function saveLocks() { writeJSON(K_LOCKS, locks.value) }
  function refreshLocks() { locks.value = readJSON<Record<string, GroupLock>>(K_LOCKS, {}) }
  window.addEventListener('storage', (e) => {
    if (e.key === K_LOCKS && typeof e.newValue === 'string') {
      try { locks.value = JSON.parse(e.newValue) } catch {}
    }
  })

  // persisted session (except locks)
  const persisted = reactive<PersistedState>(readJSON<PersistedState>(K_SESSION, {
    groupId: null,
    currentTab: 'activity1',
    role: null,
    recordsByGroup: {},
  }))
  function saveSession() { writeJSON(K_SESSION, persisted) }
  watch(persisted, saveSession, { deep: true })

  // Derived（只要有groupId就视为已登录，实现真正的持久登录）
  const isLoggedIn = () => {
    const gid = persisted.groupId
    if (gid == null) return false
    // 只要有groupId就认为已登录，不再检查锁的所有权
    return true
  }
  const currentGroupKey = () => (persisted.groupId == null ? '' : String(persisted.groupId))

  // Lock helpers（简化版，只用于记录锁信息）
  function acquire(groupId: number) {
    const k = String(groupId)
    locks.value = { ...locks.value, [k]: { by: lockerId, at: now() } }
    saveLocks()
  }
  function release(groupId: number | null) {
    if (groupId == null) return
    const k = String(groupId)
    const cp = readJSON<Record<string, GroupLock>>(K_LOCKS, {})
    if (cp[k] && cp[k].by === lockerId) delete cp[k]
    writeJSON(K_LOCKS, cp)
    locks.value = cp
  }

  // API
  function login(groupId: number, role: 'recorder' | 'operator' = 'recorder') {
    // 直接设置groupId、role和获取锁，不再检查是否可以登录
    persisted.groupId = groupId
    persisted.role = role
    acquire(groupId)
    saveSession()
    // 广播登录事件
    try { emit({ type: 'session:login', groupId, role }) } catch {}
  }
  function logout() {
    const gid = persisted.groupId
    const userRole = persisted.role
    release(gid)
    // 清空该组的所有记录
    if (gid != null) {
      const k = String(gid)
      const rec = { ...persisted.recordsByGroup }
      if (rec[k]) delete rec[k]
      persisted.recordsByGroup = rec
    }
    persisted.groupId = null
    persisted.role = null
    saveSession()
    // 注意：不再清理lockerId，保证同一个浏览器可以重新登录同一个组
    // 广播退出事件
    if (gid != null) { 
      try { emit({ type: 'session:logout', groupId: gid, role: userRole }) } catch {} 
    }
  }
  function setTab(tab: TabKey) {
    persisted.currentTab = tab
    saveSession()
  }
  function getRecords<T = any>(key: string, defVal: T): T {
    const g = currentGroupKey()
    if (!g) return defVal
    const recs = persisted.recordsByGroup[g] || {}
    return (recs[key] ?? defVal) as T
  }
  function setRecords(key: string, val: any) {
    const g = currentGroupKey()
    if (!g) return
    if (!persisted.recordsByGroup[g]) persisted.recordsByGroup[g] = {}
    persisted.recordsByGroup[g][key] = val
    saveSession()
  }

  // —— 自动续登：直接占用锁，实现真正的持久登录 ——
  ;(() => {
    const gid = persisted.groupId
    if (gid == null) return
    const k = String(gid)
    const userRole = persisted.role || 'recorder'
    // 直接占用锁，无需检查
    acquire(gid)
    // 广播登录事件
    try { emit({ type: 'session:login', groupId: gid, role: userRole }) } catch {}
  })()

  // —— 响应教师端 ping：回报在线与当前星星 ——
  try {
    const off = subscribe((e) => {
      if (e.type !== 'teacher:ping') return
      const gid = persisted.groupId
      if (gid == null) return
      if (!isLoggedIn()) return
      
      const userRole = persisted.role || 'recorder'
      
      // 补发在线（包含角色信息）
      try { emit({ type: 'session:login', groupId: gid, role: userRole }) } catch {}
      
      // 只有记录员才回放各活动 stars
      if (userRole === 'recorder') {
        const starsA1 = getRecords<number>('stars_a1', 0)
        const starsA2 = getRecords<number>('stars_a2', 0)
        const starsA3 = getRecords<number>('stars_a3', 0)
        const starsA4 = getRecords<number>('stars_a4', 0)
        if (typeof starsA1 === 'number') try { emit({ type: 'student:update', groupId: gid, activity: 'a1', stars: starsA1, payload: null }) } catch {}
        if (typeof starsA2 === 'number') try { emit({ type: 'student:update', groupId: gid, activity: 'a2', stars: starsA2, payload: null }) } catch {}
        if (typeof starsA3 === 'number') try { emit({ type: 'student:update', groupId: gid, activity: 'a3', stars: starsA3, payload: null }) } catch {}
        if (typeof starsA4 === 'number') try { emit({ type: 'student:update', groupId: gid, activity: 'a4', stars: starsA4, payload: null }) } catch {}
      }
    })
    // 不持久保留 off；页面卸载后上下文会销毁
  } catch {}

  return {
    lockerId,
    locks,
    persisted,
    isLoggedIn,
    login,
    logout,
    refreshLocks,
    setTab,
    getRecords,
    setRecords,
  }
})
