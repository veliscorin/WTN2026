import { NextResponse } from 'next/server';
import { docClient } from '@/lib/aws-config';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';

function toSingaporeISO(date: Date) {
    const tzOffset = 8 * 60; // Minutes
    // Adjust to SG time
    const localTime = new Date(date.getTime() + tzOffset * 60 * 1000);
    // Remove milliseconds and append +08:00
    return localTime.toISOString().split('.')[0] + '+08:00';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const SESSIONS_TABLE = process.env.DYNAMODB_SESSIONS_TABLE || "WTN_Sessions";
  
  // Parse Query Params (Default: Lobby=3, Duration=5)
  const lobbyMinutes = parseInt(searchParams.get('lobby') || '3', 10);
  const durationMinutes = parseInt(searchParams.get('duration') || '5', 10);

  // Calculate Start Time: Now + Lobby Minutes
  const now = Date.now();
  const future = new Date(now + (lobbyMinutes * 60 * 1000));
  const startTimeStr = toSingaporeISO(future);

  // Define the Test Session
  const testSession = {
    id: "test_session_now",
    name: "Client Test Session (Reset)",
    startTime: startTimeStr,
    durationMinutes: durationMinutes,
    entryWindowMinutes: lobbyMinutes,
    // Allow all standard seeded schools
    schoolIds: ["sch_01", "sch_02", "sch_03", "sch_04", "sch_05", "sch_06", "sch_07", "sch_08", "sch_09"]
  };

  try {
    const command = new PutCommand({
      TableName: SESSIONS_TABLE,
      Item: testSession
    });

    await docClient.send(command);

    return NextResponse.json({
      success: true,
      message: "Test session 'test_session_now' has been reset.",
      details: {
        startTime: startTimeStr,
        startsIn: `${lobbyMinutes} minutes`,
        duration: `${durationMinutes} minutes`,
        targetSessionId: "test_session_now"
      },
      instruction: `You can now log in at /prototype. The lobby will open immediately, and the quiz will start in ${lobbyMinutes} minutes.`
    });

  } catch (error) {
    console.error("Error resetting session:", error);
    return NextResponse.json({ 
        success: false, 
        error: "Failed to reset session.", 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
