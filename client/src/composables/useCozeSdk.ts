import { onMounted, onBeforeUnmount } from 'vue'

let sdkLoadPromise: Promise<void> | null = null
// 确保只创建一个 SDK 客户端（悬浮窗唯一）
let webchatClientSingleton: any = null

function loadCozeSdkScript(src: string) {
  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
      if (existing && (window as any).CozeWebSDK) {
        resolve()
        return
      }
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('failed to load coze sdk'))
      document.head.appendChild(s)
    })
  }
  return sdkLoadPromise
}

export interface CozeSdkOptions {
  scriptUrl?: string
  clientOptions?: any
  // 快速放大字体（方案A）：通过注入样式提升 Chat SDK 字体
  // 建议使用如 '16px' | '17px' | '18px'，默认 16px
  fontSize?: string
}

function injectFontStyle(fontSize: string) {
  const id = 'coze-chat-font-overrides'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
/* 尽量限定在可能的 SDK 容器上，避免影响站点其他区域。
   SDK 的具体类名可能变动，这里使用包含 coze 的类名或 id 做兜底。 */
div[class*="coze"], section[class*="coze"], aside[class*="coze"],
div[id*="coze"], section[id*="coze"], aside[id*="coze"] {
  font-size: ${fontSize} !important;
  line-height: 1.5 !important;
}
div[class*="coze"] *, section[class*="coze"] *, aside[class*="coze"] *,
div[id*="coze"] *, section[id*="coze"] *, aside[id*="coze"] * {
  font-size: ${fontSize} !important;
  line-height: 1.5 !important;
}
  `
  document.head.appendChild(style)
}

export function useCozeSdk(options?: CozeSdkOptions) {
  const scriptUrl = options?.scriptUrl ?? 'https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.19/libs/cn/index.js'
  const clientOptions = options?.clientOptions ?? {
    config: { type: 'bot', bot_id: '7553184990411292708', isIframe: false },
    auth: { type: 'token', token: 'pat_qEi7EbLQ58XZ5rOfCmunL0jgu73OfbFtHMPG6p0EBehkFDZ0j97r3wfMGgjlnX0F', onRefreshToken: async () => 'token' },
    userInfo: { id: 'user', url: 'https://lf-coze-web-cdn.coze.cn/obj/eden-cn/lm-lgvj/ljhwZthlaukjlkulzlp/coze/coze-logo.png', nickname: 'User' },
    ui: {
      base: { icon: 'https://lf-coze-web-cdn.coze.cn/obj/eden-cn/lm-lgvj/ljhwZthlaukjlkulzlp/coze/chatsdk-logo.png', layout: 'pc', lang: 'en', zIndex: 1000 },
      header: { isShow: true, isNeedClose: true },
      asstBtn: { isNeed: true },
      footer: { isShow: true, expressionText: 'Powered by ...' },
      chatBot: { title: 'Coze Bot', uploadable: true, width: 2000 }
    }
  }
  const fontSize = options?.fontSize ?? '16px'

  let client: any = null

  onMounted(async () => {
    try {
      await loadCozeSdkScript(scriptUrl)
      const CozeWebSDK = (window as any).CozeWebSDK
      if (!CozeWebSDK) return
      // 若已创建过，则复用，避免产生多个浮窗
      if (webchatClientSingleton) {
        client = webchatClientSingleton
      } else {
        // @ts-ignore
        client = new CozeWebSDK.WebChatClient(clientOptions)
        webchatClientSingleton = client
      }
      // 初始化完成后，注入字体放大样式（快速方案 A）
      injectFontStyle(fontSize)
    } catch (e) {
      console.error('初始化 Coze Chat SDK 失败: ', e)
    }
  })

  onBeforeUnmount(() => {
    // 保持单例，不在卸载时销毁，防止多次创建
    client = null
  })

  return { }
}
