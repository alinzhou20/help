// Simple realtime bus with BroadcastChannel fallback; socket.io optional
export type ActivityKey = 'a1'|'a2'|'a3'
export type RealtimeEvent =
  | { type: 'session:login'; groupId: number; role?: 'recorder' | 'operator' }
  | { type: 'session:logout'; groupId: number; role?: 'recorder' | 'operator' | null }
  | { type: 'student:update'; groupId: number; activity: ActivityKey; stars: number; payload: any }
  | { type: 'teacher:ping' }
  | { type: 'teacher:broadcast'; activity: ActivityKey; data: { code: string; codeInfo: any; totalHeads: number; totalLegs: number } }
  | { type: 'student:request-broadcast'; activity: ActivityKey; groupId: number }
  | { type: 'teacher:activity3:broadcast'; activity: ActivityKey; data: { directions: string[]; timestamp: number } }
  | { type: 'activity3:sync'; groupId: number; data: { optimizationDirection: string; pythonCode: string; runOutput: string; hasError: boolean; stars: number } }
  | { type: 'activity3:operator-sync'; groupId: number; data: { optimizationDirection: string; pythonCode: string; runOutput: string; hasError: boolean } }
  | { type: 'teacher:logout' }
  | { type: 'teacher:clear-broadcasts' }
  | { type: 'teacher:broadcasts-cleared' }
let bc: BroadcastChannel | null = null
let ioSocket: any = null
let connected = false

function ensureBC() {
  if (!bc) bc = new BroadcastChannel('va_classroom')
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existed = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existed) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('failed to load: ' + src))
    document.head.appendChild(s)
  })
}

export async function connectSocket(url?: string) {
  if (connected) return ioSocket
  try {
    await loadScript('https://cdn.socket.io/4.7.5/socket.io.min.js')
    // @ts-ignore
    const io = (window as any).io
    if (io) {
      // 使用相对路径，通过 Vite 代理连接
      // 这样可以避免跨域问题，并统一通过前端服务器
      const socketUrl = url || ''  // 使用空字符串表示连接到当前域
      
      console.log('[Socket.io] Connecting through proxy')
      
      ioSocket = io(socketUrl, { 
        path: '/socket.io/',  // 指定 Socket.IO 路径
        transports: ['websocket', 'polling'], 
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })
      
      // 监听连接事件
      ioSocket.on('connect', () => {
        connected = true
        console.log('[Socket.io] Successfully connected through proxy')
      })
      
      ioSocket.on('connect_error', (error: any) => {
        console.error('[Socket.io] Connection error:', error.message)
      })
    }
  } catch (e) {
    console.error('[Socket.io] Connection failed:', e)
  }
  return ioSocket
}

// 自动初始化 Socket.io 连接
let initPromise: Promise<any> | null = null
function ensureSocketConnection() {
  if (!initPromise) {
    initPromise = connectSocket()
  }
  return initPromise
}

export async function emit(evt: RealtimeEvent) {
  try {
    ensureBC()
    bc!.postMessage(evt)
  } catch {}
  
  // 确保 Socket.io 已连接
  await ensureSocketConnection()
  try {
    if (connected && ioSocket) ioSocket.emit('event', evt)
  } catch {}
}

export function subscribe(handler: (evt: RealtimeEvent) => void) {
  ensureBC()
  const onMsg = (e: MessageEvent) => {
    const data = e.data as RealtimeEvent
    if (!data || !data.type) return
    handler(data)
  }
  bc!.addEventListener('message', onMsg)
  
  // 确保 Socket.io 连接并注册处理器
  ensureSocketConnection().then(() => {
    try {
      if (connected && ioSocket) ioSocket.on('event', handler)
    } catch {}
  })
  
  return () => {
    try { bc?.removeEventListener('message', onMsg) } catch {}
    try { if (connected && ioSocket) ioSocket.off('event', handler) } catch {}
  }
}
