import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { CozeAPI, ChatStatus, RoleType, COZE_COM_BASE_URL, COZE_CN_BASE_URL } from '@coze/api'

dotenv.config()

const PORT = process.env.PORT || 5174
const HOST = process.env.HOST || '0.0.0.0'
const COZE_API_TOKEN = process.env.COZE_API_TOKEN
const COZE_BOT_ID = process.env.COZE_BOT_ID
const COZE_BASE_URL = process.env.COZE_BASE_URL

if (!COZE_API_TOKEN) {
  console.warn('[server] Missing COZE_API_TOKEN in environment')
}
if (!COZE_BOT_ID) {
  console.warn('[server] Missing COZE_BOT_ID in environment')
}
console.log('[server] Env check', {
  hasToken: Boolean(COZE_API_TOKEN),
  hasBotId: Boolean(COZE_BOT_ID),
  port: PORT,
  baseURL: COZE_BASE_URL || '(default)'
})

const resolvedBaseURL = COZE_BASE_URL || COZE_COM_BASE_URL
console.log('[server] Using baseURL:', resolvedBaseURL)
const client = new CozeAPI({ token: COZE_API_TOKEN || '', baseURL: resolvedBaseURL })

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

// static uploads
const UP_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR)
app.use('/uploads', express.static(UP_DIR))

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UP_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '')
      const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`
      cb(null, name)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Non-streaming chat
app.post('/api/coze/chat', async (req, res) => {
  try {
    const { text, images } = req.body || {}
    console.log('[chat] incoming', { textLen: text?.length ?? 0, imagesCount: Array.isArray(images) ? images.length : 0 })
    if (!text) {
      return res.status(400).json({ error: 'text is required' })
    }
    const additional = []
    if (Array.isArray(images)) {
      for (const url of images) {
        if (typeof url === 'string' && url) {
          additional.push({ role: RoleType.User, content: url, content_type: 'image' })
        }
      }
    }
    additional.push({ role: RoleType.User, content: text, content_type: 'text' })

    const start = Date.now()
    const resp = await client.chat.createAndPoll({
      bot_id: COZE_BOT_ID,
      chat_config: { user_id: 'web-user' },
      additional_messages: additional.map(m => ({ ...m, type: 'question' }))
    })
    console.log('[chat] resp.status', resp?.chat?.status, 'elapsed', Date.now() - start, 'ms')

    if (resp.chat.status === ChatStatus.COMPLETED) {
      const messages = resp.messages || []
      // 优先提取 type === 'answer' 的文本，其次提取 content_type === 'text' 的消息
      const textParts = []
      for (const m of messages) {
        const isAnswerType = m.type === 'answer'
        const isTextContent = m.content_type === 'text' || typeof m.content === 'string'
        if ((isAnswerType || isTextContent) && typeof m.content === 'string') {
          textParts.push(m.content)
        }
      }
      const answerText = textParts.join('')
      return res.json({ messages, usage: resp.chat.usage, answer: { content: answerText } })
    }
    return res.status(202).json({ status: resp.chat.status })
  } catch (err) {
    console.error('[chat] error:', err?.status || '', err?.code || '', err?.msg || err)
    // 若是获取开场白失败，降级返回友好文案，避免前端报错打断首屏
    try {
      const { text } = req.body || {}
      if (text === '开场白') {
        return res.status(200).json({
          messages: [],
          usage: null,
          answer: { content: '你好，我是你的智能体助手。你可以直接输入问题或上传图片描述需求，我会尽力帮你。' },
          meta: { fallback: true }
        })
      }
    } catch {}
    res.status(500).json({ error: 'chat failed' })
  }
})

// Image upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'no file' })
    const url = `/uploads/${file.filename}`
    res.json({ url })
  } catch (e) {
    console.error('[upload] error:', e)
    res.status(500).json({ error: 'upload failed' })
  }
})

// Streaming chat via SSE
app.post('/api/coze/chat/stream', async (req, res) => {
  try {
    const { text, images } = req.body || {}
    console.log('[stream] incoming', { textLen: text?.length ?? 0, imagesCount: Array.isArray(images) ? images.length : 0 })
    if (!text) {
      res.writeHead(400)
      return res.end('text required')
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const additional = []
    if (Array.isArray(images)) {
      for (const url of images) {
        if (typeof url === 'string' && url) {
          additional.push({ role: RoleType.User, content: url, content_type: 'image' })
        }
      }
    }
    additional.push({ role: RoleType.User, content: text, content_type: 'text' })

    const stream = await client.chat.stream({
      bot_id: COZE_BOT_ID,
      chat_config: { user_id: 'web-user' },
      additional_messages: additional.map(m => ({ ...m, type: 'question' }))
    })

    for await (const part of stream) {
      // We forward only delta content events to client
      if (part?.event === 'conversation.message.delta' && part?.data?.content) {
        res.write(`data: ${JSON.stringify({ type: 'delta', content: part.data.content })}\n\n`)
      }
      if (part?.event === 'conversation.chat.completed') {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        break
      }
    }

    res.end()
  } catch (err) {
    console.error('[stream] error:', err)
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'stream failed' })}\n\n`)
      res.end()
    } catch {}
  }
})

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on ${HOST}:${PORT}`)
})
