import { docClient } from "./aws-config";
import { UpdateCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { UserState, Question, Difficulty, School } from "../types/quiz";

const USER_TABLE = process.env.DYNAMODB_USER_TABLE || "WTN_Participants";
const QUESTIONS_TABLE = process.env.DYNAMODB_QUESTIONS_TABLE || "WTN_Questions";
const SCHOOLS_TABLE = process.env.DYNAMODB_SCHOOLS_TABLE || "WTN_Schools";

export async function getSchools(): Promise<School[]> {
  const command = new ScanCommand({
    TableName: SCHOOLS_TABLE,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as School[];
}

export async function getUserState(email: string): Promise<UserState | null> {
  const command = new GetCommand({
    TableName: USER_TABLE,
    Key: { email },
  });

  const response = await docClient.send(command);
  return (response.Item as UserState) || null;
}

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

export interface QuestionWithKey extends Question {
  correct_key: string;
}

export async function getAllQuestionsInternal(): Promise<QuestionWithKey[]> {
  const command = new ScanCommand({
    TableName: QUESTIONS_TABLE,
  });

  const response = await docClient.send(command);
  return (response.Items || []) as QuestionWithKey[];
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
    UpdateExpression: "SET is_disqualified = :true, strike_count = :max, #s = :status",
    ExpressionAttributeNames: {
      "#s": "status"
    },
    ExpressionAttributeValues: {
      ":true": true,
      ":max": 3,
      ":status": "DISQUALIFIED"
    }
  });
  await docClient.send(command);
}
