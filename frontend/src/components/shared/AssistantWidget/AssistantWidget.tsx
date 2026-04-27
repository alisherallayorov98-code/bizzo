import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, X, Mic, MicOff, Send, Loader, User, Bot, Trash2 } from 'lucide-react'
import api from '@config/api'
import { useAssistantActions, type AssistantAction, type ActionResult } from './useAssistantActions'
import { cn } from '@utils/cn'

interface ChatMessage {
  id:      string
  role:    'user' | 'assistant'
  text:    string
  result?: ActionResult
}

const HISTORY_KEY  = 'bizzo-assistant-history'
const MAX_HISTORY  = 50

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : []
  } catch { return [] }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)))
  } catch {}
}

export function AssistantWidget() {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState<ChatMessage[]>(() => loadHistory())
  const [input,     setInput]     = useState('')
  const [recording, setRecording] = useState(false)

  // Tarixni avtomatik saqlab borish
  useEffect(() => { saveHistory(messages) }, [messages])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const messagesEndRef   = useRef<HTMLDivElement>(null)

  const { execute } = useAssistantActions()

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial welcome (faqat tarix umuman bo'sh bo'lsa)
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id:   crypto.randomUUID(),
        role: 'assistant',
        text: 'Assalomu alaykum! 👋 Men sizning AI yordamchingizman.\n\n**Misollar:**\n• "Akmalga 200 ming chiqim qil yetkazib berish uchun"\n• "Bugun qancha sotdim?"\n• "Ombor sahifasini och"\n• "Bobur Karimovni topib ber"\n\nYozing yoki mikrofonni bosib gapiring.',
      }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const clearHistory = () => {
    setMessages([])
    try { localStorage.removeItem(HISTORY_KEY) } catch {}
  }

  // ============================================
  // YOZMA BUYRUQ
  // ============================================
  const sendMut = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post('/assistant/text', { text })
      return res.data.data as AssistantAction
    },
    onSuccess: async (action, text) => {
      const result = await execute(action)
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: result.message, result },
      ])
    },
    onError: (e: any) => {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: e?.response?.data?.message ?? 'Xatolik' },
      ])
    },
  })

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text }])
    setInput('')
    sendMut.mutate(text)
  }

  // ============================================
  // OVOZLI BUYRUQ
  // ============================================
  const voiceMut = useMutation({
    mutationFn: async (audio: Blob) => {
      const fd = new FormData()
      fd.append('audio', audio, 'voice.webm')
      const res = await api.post('/assistant/voice', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data as AssistantAction
    },
    onSuccess: async (action) => {
      // User'ning ovozli xabarini ham qo'shamiz (transkriptsiya ko'rinmaydi, lekin marker)
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', text: '🎤 [Ovoz]' },
      ])
      const result = await execute(action)
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: result.message, result },
      ])
    },
    onError: (e: any) => {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: e?.response?.data?.message ?? 'Ovozni tushuna olmadim' },
      ])
    },
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        if (blob.size > 1000) voiceMut.mutate(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Mikrofonga ruxsat berilmadi' },
      ])
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
  }

  const isLoading = sendMut.isPending || voiceMut.isPending

  return (
    <>
      {/* FLOATING TUGMA */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full',
            'bg-accent-primary text-white shadow-2xl',
            'flex items-center justify-center',
            'hover:scale-105 transition-transform',
            'border-4 border-bg-primary',
          )}
          title="AI yordamchi"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* PANEL */}
      {open && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[100]',
          'w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)]',
          'bg-bg-primary border border-border-primary rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden',
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-bg-secondary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Sparkles size={15} className="text-accent-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">AI Yordamchi</p>
                <p className="text-[10px] text-text-muted">Yozing yoki mikrofon bilan gapiring</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  onClick={clearHistory}
                  className="text-text-muted hover:text-danger p-1 rounded hover:bg-danger/10"
                  title="Tarixni tozalash"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-tertiary"
                title="Yopish"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(m => (
              <div
                key={m.id}
                className={cn(
                  'flex gap-2',
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  m.role === 'user'
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-bg-tertiary text-text-secondary',
                )}>
                  {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div className={cn(
                  'max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                  m.role === 'user'
                    ? 'bg-accent-primary text-white rounded-tr-sm'
                    : m.result?.type === 'error'
                      ? 'bg-danger/10 text-danger border border-danger/20 rounded-tl-sm'
                      : m.result?.type === 'success'
                        ? 'bg-success/10 text-success border border-success/20 rounded-tl-sm'
                        : 'bg-bg-tertiary text-text-primary rounded-tl-sm',
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-text-secondary" />
                </div>
                <div className="px-3 py-2 rounded-2xl bg-bg-tertiary">
                  <Loader size={14} className="animate-spin text-text-muted" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border-primary bg-bg-secondary">
            <div className="flex items-center gap-2">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={isLoading}
                className={cn(
                  'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  recording
                    ? 'bg-danger text-white animate-pulse'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-accent-primary/10 hover:text-accent-primary',
                )}
                title={recording ? "To'xtatish" : "Mikrofon (Gemini)"}
              >
                {recording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isLoading || recording}
                placeholder={recording ? '🎤 Tinglayapman...' : 'Yozing va Enter bosing...'}
                className="flex-1 px-3 py-2 rounded-full border border-border-primary bg-bg-primary text-sm focus:outline-none focus:border-accent-primary"
              />

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={cn(
                  'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  input.trim()
                    ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                    : 'bg-bg-tertiary text-text-muted',
                )}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
