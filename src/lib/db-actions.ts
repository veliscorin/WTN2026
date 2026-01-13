import { docClient } from "./aws-config";
import { UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { UserState, Question, Difficulty } from "../types/quiz";

const USER_TABLE = process.env.DYNAMODB_USER_TABLE || "UserState";
const QUESTIONS_TABLE = process.env.DYNAMODB_QUESTIONS_TABLE || "Questions";

export async function saveUserState(email: string, schoolId: string, state: Partial<UserState>) {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Ensure school_id is updated/set if provided
  if (schoolId) {
      updateExpressions.push("#school_id = :school_id");
      expressionAttributeNames["#school_id"] = "school_id";
      expressionAttributeValues[":school_id"] = schoolId;
  }

  Object.entries(state).forEach(([key, value]) => {
    if (key === 'email' || key === 'school_id') return;
    
    const attrName = `#${key}`;
    const attrValue = `:${key}`;
    
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  if (updateExpressions.length === 0) return;

  const command = new UpdateCommand({
    TableName: USER_TABLE,
    Key: { email },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  await docClient.send(command);
}

export async function getQuestionsByDifficulty(difficulty: Difficulty): Promise<Question[]> {
  const command = new ScanCommand({
    TableName: QUESTIONS_TABLE,
    FilterExpression: "difficulty = :d",
    ExpressionAttributeValues: {
      ":d": difficulty,
    },
  });

  const response = await docClient.send(command);
  const items = response.Items || [];
  
  // Map and strip any internal fields like correct_key
  return items.map((item: any) => ({
      qid: item.qid,
      difficulty: item.difficulty,
      text: item.text,
      options: item.options
  }));
}

export async function flagDisqualified(email: string) {
  const command = new UpdateCommand({
    TableName: USER_TABLE,
    Key: { email },
    UpdateExpression: "SET is_disqualified = :true, strike_count = :max",
    ExpressionAttributeValues: {
      ":true": true,
      ":max": 3
    }
  });
  await docClient.send(command);
}
