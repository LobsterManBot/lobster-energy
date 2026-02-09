import { NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI chat not configured. Please add OPENAI_API_KEY.' },
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextMessage },
          ...messages.slice(-10) // Keep last 10 messages for context
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error('OpenAI error:', data.error)
      return NextResponse.json(
        { error: data.error.message || 'AI request failed' },
        { status: 500 }
      )
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
