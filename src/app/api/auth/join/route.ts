import { NextResponse } from 'next/server';
import { docClient } from '@/lib/aws-config';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';

const USER_TABLE = process.env.DYNAMODB_USER_TABLE || "WTN_Participants";

export async function POST(request: Request) {
  try {
    const { email, schoolId, schoolName } = await request.json();

    if (!email || !schoolId) {
      return NextResponse.json({ error: 'Email and School ID are required.' }, { status: 400 });
    }

    // 1. Attempt to CREATE the user ONLY if they don't exist (Sabotage Lock)
    const initialUser = {
      email,
      school_id: schoolId,
      status: 'LOBBY',
      joined_at: Date.now(),
      strike_count: 0,
      is_disqualified: false,
      score: 0
    };

    try {
      const putCommand = new PutCommand({
        TableName: USER_TABLE,
        Item: initialUser,
        ConditionExpression: "attribute_not_exists(email)"
      });

      await docClient.send(putCommand);

      // Success: New user created
      return NextResponse.json({ success: true, status: 'CREATED' });

    } catch (err: any) {
      // 2. If ConditionCheckFailed, the user ALREADY exists.
      if (err.name === 'ConditionalCheckFailedException') {
        
        // Fetch the existing user to verify identity
        const getCommand = new GetCommand({
          TableName: USER_TABLE,
          Key: { email }
        });
        const { Item: existingUser } = await docClient.send(getCommand);

        if (!existingUser) {
           // Should be impossible given the error, but handle it
           return NextResponse.json({ error: "System Error: User exists but not found." }, { status: 500 });
        }

        // 3. SECURITY CHECK: Does the school match?
        if (existingUser.school_id !== schoolId) {
           // SABOTAGE ATTEMPT: Someone trying to claim an existing email from a different school
           return NextResponse.json({ 
             error: "This email is already active with a different school session.",
             code: "SABOTAGE_BLOCK"
           }, { status: 403 });
        }

        // 4. Resume Logic
        if (existingUser.is_disqualified) {
             return NextResponse.json({ error: "User is disqualified.", code: "DISQUALIFIED" }, { status: 403 });
        }

        // Allow resume
        return NextResponse.json({ 
            success: true, 
            status: 'RESUMED', 
            prevStatus: existingUser.status 
        });
      }

      throw err; // Re-throw other errors
    }

  } catch (error) {
    console.error("Join Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
