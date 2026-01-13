import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_SCHOOLS_TABLE || 'WTN_Schools';
const REGION = process.env.WTN_AWS_REGION || "ap-southeast-1";

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.WTN_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WTN_AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(client);

const schools = [
  // Session 1 (Apr 8)
  { id: "sch_01", name: "Raffles Institution", domain: "ri.edu.sg" },
  { id: "sch_02", name: "Hwa Chong Institution", domain: "hci.edu.sg" },
  { id: "sch_03", name: "Anglo-Chinese School (Independent)", domain: "acs.edu.sg" },
  // Session 2 (Apr 12)
  { id: "sch_04", name: "Nanyang Girls' High School", domain: "nygh.edu.sg" },
  { id: "sch_05", name: "Dunman High School", domain: "dhs.edu.sg" },
  { id: "sch_06", name: "River Valley High School", domain: "rvhs.edu.sg" },
  // Session 3 (Apr 15)
  { id: "sch_07", name: "Victoria School", domain: "vs.edu.sg" },
  { id: "sch_08", name: "Cedar Girls' Secondary School", domain: "cedar.edu.sg" },
  { id: "sch_09", name: "St. Joseph's Institution", domain: "sji.edu.sg" }
];

async function seedSchools() {
  try {
    console.log(`Clearing and reseeding ${TABLE_NAME}...`);

    // 1. Write new data (BatchWrite overwrites items with same keys)
    // Note: To truly "clear" we'd delete first, but overwriting is usually sufficient 
    // unless you want to remove old IDs like 'sch_10' if they existed.
    // For now, I'll just overwrite.

    // DynamoDB BatchWrite limit is 25 items
    const chunkArray = (arr: any[], size: number): any[][] =>
      arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [arr];

    const chunks = chunkArray(schools, 25);

    for (const [index, chunk] of chunks.entries()) {
      const putRequests = chunk.map((item: any) => ({
        PutRequest: {
          Item: item,
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      });

      console.log(`Writing batch ${index + 1} of ${chunks.length}...`);
      await docClient.send(command);
    }

    console.log('✅ 9 Schools seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding schools:', error);
    process.exit(1);
  }
}

seedSchools();