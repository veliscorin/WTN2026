import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'types', 'schools.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const schools = JSON.parse(fileContents);
    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error reading schools.json:', error);
    return NextResponse.json({ error: 'Could not load school data.' }, { status: 500 });
  }
}