/**
 * 紧急清理工具：清理指定小组的锁
 * 当遇到小组被锁定无法登录时，可以在浏览器控制台运行此函数
 */
export function clearGroupLock(groupId: number) {
  const K_LOCKS = 'va_session_locks'
  try {
    const locksStr = localStorage.getItem(K_LOCKS)
    if (!locksStr) {
      console.log('没有找到任何锁')
      return
    }
    
    const locks = JSON.parse(locksStr)
    const k = String(groupId)
    
    if (locks[k]) {
      delete locks[k]
      localStorage.setItem(K_LOCKS, JSON.stringify(locks))
      console.log(`已清理小组 ${groupId} 的锁`)
      console.log('请刷新页面后重新登录')
    } else {
      console.log(`小组 ${groupId} 没有被锁定`)
    }
  } catch (e) {
    console.error('清理锁失败：', e)
  }
}

// 清理所有锁
export function clearAllLocks() {
  const K_LOCKS = 'va_session_locks'
  try {
    localStorage.removeItem(K_LOCKS)
    console.log('已清理所有锁')
    console.log('请刷新页面后重新登录')
  } catch (e) {
    console.error('清理锁失败：', e)
  }
}

// 将函数挂载到window对象，方便在控制台使用
if (typeof window !== 'undefined') {
  (window as any).clearGroupLock = clearGroupLock;
  (window as any).clearAllLocks = clearAllLocks;
  
  console.log('锁清理工具已加载。使用方法：');
  console.log('- clearGroupLock(1) // 清理小组1的锁');
  console.log('- clearAllLocks() // 清理所有锁');
}









