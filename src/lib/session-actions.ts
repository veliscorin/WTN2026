import { docClient } from "./aws-config";
import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Session } from "../types/quiz";

const SESSIONS_TABLE = process.env.DYNAMODB_SESSIONS_TABLE || "WTN_Sessions";

// Find which session a school belongs to
export async function getSessionForSchool(schoolId: string): Promise<Session | null> {
  // Since we don't have many sessions, a Scan is acceptable. 
  // In a massive system, we'd use a GSI, but for < 10 sessions, this is faster/simpler.
  const command = new ScanCommand({
    TableName: SESSIONS_TABLE,
  });

  const response = await docClient.send(command);
  const sessions = (response.Items || []) as Session[];

  // Find the session that contains this schoolId
  return sessions.find(s => s.schoolIds.includes(schoolId)) || null;
}

// Get a specific session by ID (useful for admin/testing)
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const command = new GetCommand({
    TableName: SESSIONS_TABLE,
    Key: { id: sessionId },
  });
  
  const response = await docClient.send(command);
  return (response.Item as Session) || null;
}
