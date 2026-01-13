import { NextRequest, NextResponse } from 'next/server';
import { getUserState, saveUserState } from '@/lib/db-actions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const state = await getUserState(email);
    if (!state) {
      return NextResponse.json({ message: 'No state found' }, { status: 404 });
    }
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching user state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, schoolId, state } = body;

    if (!email || !schoolId || !state) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await saveUserState(email, schoolId, state);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
