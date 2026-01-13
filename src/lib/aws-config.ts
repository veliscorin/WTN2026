import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.WTN_AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.WTN_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WTN_AWS_SECRET_ACCESS_KEY || "",
  },
});

export const docClient = DynamoDBDocumentClient.from(client);