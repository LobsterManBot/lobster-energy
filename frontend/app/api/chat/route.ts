import { NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `You are Lenny, the AI energy advisor for Lobster Energy. You help UK energy brokers and businesses understand wholesale electricity markets and make better procurement decisions.

Your personality:
- Friendly and approachable, but professional
- Concise and actionable - don't waffle
- Use plain English, avoid jargon unless asked
- Be confident in your analysis

Your knowledge:
- UK wholesale electricity markets (BMRS data)
- Trading signals (BUY/WAIT/HOLD) and what they mean
- Fixed vs flexible contracts
- Weather impact on energy prices
- Demand patterns and forecasting
- Price percentiles and what they indicate

Current market context will be provided with each message. Use it to give personalized, relevant advice.

Keep responses concise (2-3 paragraphs max unless asked for detail). Use emoji sparingly for friendliness 🦞`

export async function POST(request: Request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI chat not configured. Please add ANTHROPIC_API_KEY.' },
        { status: 500 }
      )
    }

    const { messages, marketContext } = await request.json()

    // Build context-aware system message
    const contextMessage = marketContext ? `

Current Market Data:
- Signal: ${marketContext.signal} (${Math.round(marketContext.confidence * 100)}% confidence)
- Current Price: £${marketContext.currentPrice}/MWh
- 30-Day Average: £${marketContext.avg30d}/MWh
- Price Percentile: ${marketContext.percentile}th (0=cheapest, 100=most expensive)
- Trend: ${marketContext.currentPrice > marketContext.avg30d ? 'Above' : 'Below'} average by ${Math.abs(((marketContext.currentPrice - marketContext.avg30d) / marketContext.avg30d) * 100).toFixed(1)}%

Use this data to inform your responses.` : ''

    // Convert messages to Anthropic format
    const anthropicMessages = messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20250220',
        max_tokens: 500,
        system: SYSTEM_PROMPT + contextMessage,
        messages: anthropicMessages,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error('Anthropic error:', data.error)
      return NextResponse.json(
        { error: data.error.message || 'AI request failed' },
        { status: 500 }
      )
    }

    const reply = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
