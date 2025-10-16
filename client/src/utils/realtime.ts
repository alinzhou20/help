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

export async function connectSocket(url = 'http://localhost:3001') {
  if (connected) return ioSocket
  try {
    await loadScript('https://cdn.socket.io/4.7.5/socket.io.min.js')
    // @ts-ignore
    const io = (window as any).io
    if (io) {
      // 自动检测当前网络地址和协议
      const host = window.location.hostname
      const isHttps = window.location.protocol === 'https:'
      const httpProtocol = isHttps ? 'https:' : 'http:'
      const port = isHttps ? 3002 : 3001  // HTTPS使用3002端口，HTTP使用3001端口
      
      // 构建Socket URL
      let socketUrl: string
      if (host === 'localhost' && !isHttps) {
        socketUrl = url  // 本地HTTP开发使用默认URL
      } else {
        socketUrl = `${httpProtocol}//${host}:${port}`
      }
      
      ioSocket = io(socketUrl, { 
        transports: ['websocket', 'polling'], 
        autoConnect: true,
        secure: isHttps,
        rejectUnauthorized: false  // 允许自签名证书
      })
      connected = true
      console.log('[Socket.io] Connected to:', socketUrl)
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
