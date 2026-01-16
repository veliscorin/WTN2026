import { NextResponse } from 'next/server';
import { getSessionForSchool } from '@/lib/session-actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    const session = await getSessionForSchool(schoolId);

    if (!session) {
      return NextResponse.json({ error: 'No active session found for this school.' }, { status: 404 });
    }

    return NextResponse.json({
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      entryWindowMinutes: session.entryWindowMinutes, // Optional custom lobby window
      name: session.name
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}