import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_QUESTIONS_TABLE || 'WTN_Questions';
const REGION = process.env.AWS_REGION || "ap-southeast-1";

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function checkTable() {
  try {
    const command = new DescribeTableCommand({ TableName: TABLE_NAME });
    const response = await client.send(command);
    console.log("Table Schema:", JSON.stringify(response.Table?.KeySchema, null, 2));
    console.log("Attribute Definitions:", JSON.stringify(response.Table?.AttributeDefinitions, null, 2));
  } catch (error) {
    console.error("Error describing table:", error);
  }
}

checkTable();
