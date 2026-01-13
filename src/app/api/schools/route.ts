import { NextResponse } from 'next/server';
import { getSchools } from '@/lib/db-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schools = await getSchools();
    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools from DynamoDB:', error);
    return NextResponse.json({ error: 'Could not load school data.' }, { status: 500 });
  }
}
