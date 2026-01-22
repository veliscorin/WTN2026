"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import questionsData from '@/data/questions.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isTestMode, TEST_MODE_CONFIG } from '@/lib/test-mode';

type Question = {
  qid: string;
  difficulty: string;
  text: string;
  options: string[];
  image_url?: string;
};

// Fisher-Yates shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function toSingaporeISO(date: Date) {
    const tzOffset = 8 * 60; // Minutes
    const localTime = new Date(date.getTime() + tzOffset * 60 * 1000);
    return localTime.toISOString().split('.')[0] + '+08:00';
}

function formatTimeTaken(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    
    let parts = [];
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    if (milliseconds > 0) parts.push(`${milliseconds}ms`);
    
    return parts.join(' ') || "0ms";
}

export default function QuizPage() {
  const router = useRouter();
  
  // State
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User Info
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  const { strikeCount } = useAntiCheat({
    onDisqualify: () => {
      router.push('/prototype/disqualified');
    },
  });

  // 1. Initialize Session & State
  useEffect(() => {
    async function init() {
      try {
        const email = localStorage.getItem('wtn_user_email');
        const sId = localStorage.getItem('wtn_school_id');
        const sName = localStorage.getItem('wtn_school_name');

        if (!email || !sId) {
          console.error("No user info found");
          router.push('/prototype');
          return;
        }
        setUserEmail(email);
        setSchoolId(sId);
        setSchoolName(sName);

        // Fetch Session Info
        const sessionRes = await fetch(`/api/session?schoolId=${sId}`);
        if (!sessionRes.ok) throw new Error("Failed to load session");
        const sessionData = await sessionRes.json();
        const startTime = new Date(sessionData.startTime).getTime();
        
        // Duration from DB
        setSessionEndTime(startTime + (sessionData.durationMinutes * 60 * 1000));

        // Fetch User State (Persistence)
        const stateRes = await fetch(`/api/quiz/state?email=${email}`);
        
        if (stateRes.ok) {
          // Restore State
          const state = await stateRes.json();
          
          // If already completed or disqualified, redirect
          if (state.status === 'COMPLETED') {
            router.push('/prototype/results');
            return;
          }
          if (state.status === 'DISQUALIFIED' || state.is_disqualified) {
            router.push('/prototype/disqualified');
            return;
          }

          if (state.question_order && state.question_order.length > 0) {
            // Reconstruct questions from order
            const orderedQuestions = state.question_order.map((qid: string) => {
               const q = questionsData.find(q => q.qid === qid);
               // Note: Options are re-shuffled on restore for now, but Question order is preserved.
               return q ? { ...q, options: shuffle(q.options) } : null;
            }).filter(Boolean) as Question[];

            setQuizQuestions(orderedQuestions);
            setCurrentQuestionIndex(state.current_index || 0);
            setResponses(state.answers || {});
            setStartTime(new Date(state.start_time).getTime());
            setIsLoading(false);
            return;
          }
        }

        // New User: Generate Random Order
        let easy = questionsData.filter(q => q.difficulty === 'Easy');
        let medium = questionsData.filter(q => q.difficulty === 'Medium');
        let hard = questionsData.filter(q => q.difficulty === 'Hard');

        easy = shuffle(easy);
        medium = shuffle(medium);
        hard = shuffle(hard);

        // Test Mode: Limit questions
        if (isTestMode()) {
            easy = easy.slice(0, 2);
            medium = medium.slice(0, 2);
            hard = hard.slice(0, 2);
        }

        const shuffledQuestions = [
          ...easy,
          ...medium,
          ...hard
        ].map(q => ({ ...q, options: shuffle(q.options) }));

        setQuizQuestions(shuffledQuestions);
        
        // Save Initial State
        const now = Date.now();
        setStartTime(now);
        const questionOrder = shuffledQuestions.map(q => q.qid);
        await fetch('/api/quiz/state', {
            method: 'POST',
            body: JSON.stringify({
                email,
                schoolId: sId,
                state: {
                    status: 'IN_PROGRESS',
                    question_order: questionOrder,
                    current_index: 0,
                    start_time: toSingaporeISO(new Date(now)),
                    strike_count: 0
                }
            })
        });

        setIsLoading(false);

      } catch (err) {
        console.error("Initialization error:", err);
        // Fallback? Or Redirect?
      }
    }

    init();
  }, [router]);

  // Effect to handle strike warnings
  useEffect(() => {
    if (strikeCount > 0 && strikeCount < 3) {
      setShowWarningModal(true);
    }
  }, [strikeCount]);

  // Effect for Timer
  useEffect(() => {
    if (!sessionEndTime) return;

    const checkTime = async () => {
      const now = Date.now();
      const left = sessionEndTime - now;
      
      if (left <= 0) {
        // Mark as completed in DB if possible
        if (userEmail && schoolId && startTime) {
          try {
            const finishTime = Date.now();
            await fetch('/api/quiz/state', {
                method: 'POST',
                body: JSON.stringify({
                    email: userEmail,
                    schoolId: schoolId,
                    state: { 
                        status: 'COMPLETED',
                        completed_at: toSingaporeISO(new Date(finishTime)),
                        time_taken: formatTimeTaken(finishTime - startTime)
                    }
                })
            });
          } catch (e) {
            console.error("Error auto-completing session:", e);
          }
        }
        router.push('/prototype/results');
      } else {
        setTimeRemaining(left);
      }
    };

    checkTime(); 
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [sessionEndTime, router]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = async () => {
    if (!selectedOption || !quizQuestions || !userEmail || !schoolId) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const newResponses = { ...responses, [currentQuestion.qid]: selectedOption };
    
    setResponses(newResponses);
    setSelectedOption(null);

    const nextIndex = currentQuestionIndex + 1;
    const isFinished = nextIndex >= quizQuestions.length;

    // Optimistic UI Update
    if (!isFinished) {
      setCurrentQuestionIndex(nextIndex);
    }
    // else if (isFinished) { // This else if is not in the original replace string, but it is in the original search string. I should keep the replace string as is. The original replace string has `else { router.push('/prototype/results'); }`
    else {
      router.push('/prototype/results');
    }

    // Background Save
    try {
        const payload: any = {
            status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
            current_index: isFinished ? currentQuestionIndex : nextIndex,
            answers: newResponses,
        };

        if (isFinished && startTime) {
            const finishTime = Date.now();
            payload.completed_at = toSingaporeISO(new Date(finishTime));
            payload.time_taken = formatTimeTaken(finishTime - startTime);
        }

        await fetch('/api/quiz/state', {
            method: 'POST',
            body: JSON.stringify({
                email: userEmail,
                schoolId: schoolId,
                state: payload
            })
        });
    } catch (e) {
        console.error("Failed to save progress", e);
    }
  };

  if (isLoading || !quizQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="text-xl font-semibold text-gray-600 dark:text-gray-400 animate-pulse">
          Loading Quiz Environment...
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalQuestions = quizQuestions.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col items-center py-10 px-4 select-none">
      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full border-2 border-red-500 shadow-2xl">
            <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ WARNING!</h2>
                <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
                Do not leave the exam! You have {strikeCount} strike(s).
                <br />
                <span className="font-bold">3 strikes will result in immediate disqualification.</span>
                </p>
                <Button 
                variant="danger"
                onClick={() => setShowWarningModal(false)}
                className="w-full"
                >
                I Understand
                </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-3xl border-0 sm:border shadow-lg overflow-hidden">
        {/* System Bar */}
        <div className="bg-gray-50 dark:bg-zinc-950/50 px-6 py-2 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center text-xs font-mono text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-[200px]" title={userEmail || ''}>{userEmail}</span>
            <span className="truncate max-w-[200px]" title={schoolName || ''}>{schoolName || schoolId}</span>
        </div>

        {/* Header: Progress, Timer & Strikes */}
        <div className="bg-gray-100 dark:bg-zinc-900/50 p-6 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-zinc-700 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
             <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
              Question <span className="text-black dark:text-white text-xl">{currentQuestionIndex + 1}</span> of {totalQuestions}
            </div>
            {timeRemaining !== null && (
              <div className="bg-gray-200 dark:bg-zinc-700 px-4 py-1 rounded-full font-mono font-bold text-gray-800 dark:text-gray-200">
                ⏱ {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Strikes:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-colors duration-300 ${
                    strikeCount >= i ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-gray-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="p-8 sm:p-10">
          <div className="mb-2">
            <span className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase",
                currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {currentQuestion.difficulty}
            </span>
          </div>
          
          {currentQuestion.image_url && (
            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={currentQuestion.image_url} 
                    alt="Question Reference" 
                    className="w-full max-h-[300px] object-cover"
                />
            </div>
          )}
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="grid gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(option)}
                className={cn(
                    "w-full text-left p-5 rounded-lg border-2 transition-all duration-200 group flex items-center justify-between",
                    selectedOption === option 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md transform scale-[1.01]' 
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                )}
              >
                <span className={cn(
                    "text-lg font-medium",
                    selectedOption === option ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {option}
                </span>
                {selectedOption === option && (
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer: Action Button */}
        <div className="bg-gray-50 dark:bg-zinc-900/50 p-6 border-t border-gray-200 dark:border-zinc-700 flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!selectedOption}
            size="lg"
            className={cn("px-8 text-lg shadow-lg", !selectedOption && "bg-gray-300 text-gray-500")}
          >
            {currentQuestionIndex === totalQuestions - 1 ? 'Finish Exam' : 'Confirm & Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
}