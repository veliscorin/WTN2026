import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';

// Use env vars or default to 'WTN_Questions' as requested
const TABLE_NAME = process.env.DYNAMODB_QUESTIONS_TABLE || 'WTN_Questions';
const REGION = process.env.WTN_AWS_REGION || "ap-southeast-1";

// Validate credentials
if (!process.env.WTN_AWS_ACCESS_KEY_ID || process.env.WTN_AWS_ACCESS_KEY_ID === 'your_access_key_id') {
  console.error('❌ Error: Invalid AWS Credentials in .env.local');
  console.error('Please update .env.local with your actual WTN_AWS_ACCESS_KEY_ID and WTN_AWS_SECRET_ACCESS_KEY.');
  process.exit(1);
}

// Initialize Client
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.WTN_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WTN_AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(client);

async function seedQuestions() {
  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'questions.json');
    const questionsRaw = fs.readFileSync(dataPath, 'utf-8');
    const questions = JSON.parse(questionsRaw);

    // Normalize difficulty to lowercase to match Difficulty type (easy | medium | hard)
    const questionsFormatted = questions.map((q: any) => ({
      ...q,
      id: q.qid, // Map qid to id to match Table Schema
      difficulty: q.difficulty.toLowerCase()
    }));

    console.log(`Loaded ${questionsFormatted.length} questions.`);
    console.log(`Target Table: ${TABLE_NAME}`);
    console.log(`Region: ${REGION}`);

    // DynamoDB BatchWrite limit is 25 items
    const chunkArray = (arr: any[], size: number): any[][] =>
      arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [arr];

    const chunks = chunkArray(questionsFormatted, 25);

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

    console.log('✅ All questions seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    process.exit(1);
  }
}

seedQuestions();