import { NextRequest, NextResponse } from 'next/server';
import { getUserState, getAllQuestionsInternal } from '@/lib/db-actions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // 1. Fetch User State
    const userState = await getUserState(email);
    if (!userState) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userState.answers) {
       return NextResponse.json({ score: 0, total: 0, review: [] });
    }

    // 2. Fetch Answer Keys
    // In production, cache this or use a more efficient query (BatchGet) if user only answered a subset
    const allQuestions = await getAllQuestionsInternal();
    
    // 3. Grade
    let score = 0;
    const review = [];

    // Map questions for O(1) lookup
    const qMap = new Map(allQuestions.map(q => [q.qid, q]));

    for (const [qid, usersAnswer] of Object.entries(userState.answers)) {
       const question = qMap.get(qid);
       if (question) {
           const isCorrect = usersAnswer === question.correct_key;
           if (isCorrect) score++;

           review.push({
               qid,
               text: question.text,
               yourAnswer: usersAnswer,
               correctAnswer: question.correct_key,
               isCorrect
           });
       }
    }

    // 4. Return Data
    // Use the assigned question count (question_order) as the total, 
    // falling back to all questions if for some reason order is missing.
    const totalQuestions = userState.question_order ? userState.question_order.length : allQuestions.length;

    return NextResponse.json({
        score,
        total: totalQuestions,
        review
    });

  } catch (error) {
    console.error('Error calculating results:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
