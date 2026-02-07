import { NextResponse } from 'next/server';

// Simple in-memory store (replace with DB)
const users: Map<string, { email: string; password: string; name: string; createdAt: Date }> = new Map();

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (users.has(email)) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Store user
    users.set(email, {
      email,
      password, // In production, hash this!
      name: name || email.split('@')[0],
      createdAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Account created',
      user: { email, name: name || email.split('@')[0] }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
