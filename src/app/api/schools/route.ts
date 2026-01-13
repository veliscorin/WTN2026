import { NextResponse } from 'next/server';
import { getSchools } from '@/lib/db-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Debug logging for server-side logs (CloudWatch)
    console.log("Connecting to DynamoDB...");
    console.log("Region:", process.env.WTN_AWS_REGION);
    console.log("Table:", process.env.DYNAMODB_SCHOOLS_TABLE);
    console.log("Has Access Key:", !!process.env.WTN_AWS_ACCESS_KEY_ID);
    console.log("Has Secret Key:", !!process.env.WTN_AWS_SECRET_ACCESS_KEY);

    const schools = await getSchools();
    return NextResponse.json(schools);
  } catch (error: any) {
    console.error('Error fetching schools from DynamoDB:', error);
    
    // Return detailed error for debugging (remove this in production later!)
    return NextResponse.json({ 
      error: 'Could not load school data.',
      details: error.message,
      code: error.name,
      envCheck: {
        hasRegion: !!process.env.WTN_AWS_REGION,
        hasTable: !!process.env.DYNAMODB_SCHOOLS_TABLE,
        hasAccessKey: !!process.env.WTN_AWS_ACCESS_KEY_ID
      }
    }, { status: 500 });
  }
}