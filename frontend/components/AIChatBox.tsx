'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MarketContext {
  signal: string
  confidence: number
  currentPrice: number
  avg30d: number
  percentile: number
}

interface AIChatBoxProps {
  marketContext?: MarketContext
}

const QUICK_PROMPTS = [
  "Why is this the current signal?",
  "Should I lock in rates now?",
  "Explain fixed vs flexible",
  "What affects energy prices?",
]

export default function AIChatBox({ marketContext }: AIChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function sendMessage(text?: string) {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          marketContext
        }),
      })

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Sorry, I ran into an issue: ${data.error}` 
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply 
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }])
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <div>
            <h3 className="font-semibold text-white">Ask Lenny</h3>
            <p className="text-xs text-slate-400">Your AI energy advisor <span className="text-[#fb8a99]">(beta)</span></p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          {isOpen ? '−' : '+'}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-4">
                  Hi! I'm Lenny 🦞 Ask me anything about energy markets, signals, or procurement strategy.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-[#fb8a99] text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="text-sm mr-1">🦞</span>
                    )}
                    <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-xl px-4 py-2.5">
                  <span className="text-sm">🦞</span>
                  <span className="ml-2 text-slate-400 text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about signals, prices, strategy..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99] text-sm"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[#fb8a99] hover:bg-[#e87a89] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
