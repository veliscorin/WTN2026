import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_SESSIONS_TABLE || 'WTN_Sessions';
const REGION = process.env.WTN_AWS_REGION || "ap-southeast-1";

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.WTN_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WTN_AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// Helper to format a date to Singapore ISO string manually
function toSingaporeISO(date: Date) {
    const tzOffset = 8 * 60; // Minutes
    const localTime = new Date(date.getTime() + tzOffset * 60 * 1000);
    return localTime.toISOString().split('.')[0] + '+08:00';
}

const sessions = [
  {
    id: "session_apr_08",
    name: "April 8 Session",
    startTimeStr: "2026-04-08T11:00:00+08:00",
    schoolIds: ["sch_01", "sch_02", "sch_03"]
  },
  {
    id: "session_apr_12",
    name: "April 12 Session",
    startTimeStr: "2026-04-12T11:00:00+08:00",
    schoolIds: ["sch_04", "sch_05", "sch_06"]
  },
  {
    id: "session_apr_15",
    name: "April 15 Session",
    startTimeStr: "2026-04-15T11:00:00+08:00",
    schoolIds: ["sch_07", "sch_08", "sch_09"]
  }
];

const DURATION_MINUTES = 30;

async function seed() {
  console.log(`Seeding sessions into ${TABLE_NAME}...`);

  for (const s of sessions) {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: s.id,
        name: s.name,
        startTime: s.startTimeStr, 
        durationMinutes: DURATION_MINUTES,
        entryWindowMinutes: 30, // Standard 30 min lobby
        schoolIds: s.schoolIds
      }
    });

    await docClient.send(command);
    console.log(`✅ Seeded ${s.name}`);
    console.log(`   Start:    ${s.startTimeStr}`);
    console.log(`   Duration: ${DURATION_MINUTES} mins`);
  }

  // --- TEST SESSION (Starts 1 min from now) ---
  const now = new Date();
  const testStartTime = new Date(now.getTime() + 60 * 1000); // +1 min
  
  const testSession = {
    id: "test_session_now",
    name: "Live Test Session",
    startTime: toSingaporeISO(testStartTime),
    durationMinutes: 5,
    entryWindowMinutes: 3, // Short 3 min lobby for testing
    schoolIds: ["sch_01", "sch_02", "sch_03", "sch_04", "sch_05", "sch_06", "sch_07", "sch_08", "sch_09"]
  };

  const testCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: testSession
  });

  await docClient.send(testCommand);
  console.log(`\n✅ Seeded ${testSession.name}`);
  console.log(`   Start:    ${testSession.startTime}`);
  console.log(`   Duration: ${testSession.durationMinutes} mins`);
  console.log('   (Use this for immediate testing)');

  console.log('\nDone!');
}

seed();
