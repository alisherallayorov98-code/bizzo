import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Loader2, Bot } from 'lucide-react'
import { cn } from '@utils/cn'
import { useAIQuery } from '@features/ai/hooks/useAI'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'Bu oy savdo qanday?',
  'Omborda nima kam qoldi?',
  'Qaysi mijoz ko\'p qarzdor?',
  'Xodimlar ish haqisi holati?',
]

export function AIAssistant() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)
  const aiQuery                 = useAIQuery()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (question?: string) => {
    const q = question || input.trim()
    if (!q) return

    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')

    try {
      const answer = await aiQuery.mutateAsync(q)
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: "Kechirasiz, xatolik yuz berdi. Qaytadan urinib ko'ring.",
      }])
    }
  }

  return (
    <>
      {/* Floating tugma */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-12 h-12 rounded-full',
          'bg-gradient-to-br from-accent-primary to-purple-500',
          'flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-200',
          'hover:scale-110 active:scale-95',
          open && 'rotate-180',
        )}
      >
        {open
          ? <X size={20} className="text-white" />
          : <Sparkles size={20} className="text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 w-80 sm:w-96 bg-bg-secondary border border-border-primary rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary bg-bg-tertiary">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Bizzo AI</p>
              <p className="text-[10px] text-text-muted">Biznes yordamchingiz</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>

          {/* Xabarlar */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-text-muted text-center py-2">
                  Bizzo AI biznesingiz haqida savollaringizga javob beradi
                </p>
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-accent-primary text-white rounded-br-sm'
                      : 'bg-bg-tertiary text-text-primary border border-border-primary rounded-bl-sm',
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {aiQuery.isPending && (
              <div className="flex justify-start">
                <div className="bg-bg-tertiary border border-border-primary px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin text-accent-primary" />
                    <span className="text-xs text-text-muted">Tahlil qilinmoqda...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border-primary">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Savol bering..."
                className="flex-1 h-8 rounded-lg text-xs bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none focus:border-accent-primary placeholder:text-text-muted"
                disabled={aiQuery.isPending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || aiQuery.isPending}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
