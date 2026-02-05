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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-xl font-semibold text-gray-600 dark:text-gray-400 animate-pulse">
          Loading Quiz Environment...
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalQuestions = quizQuestions.length;

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row relative p-4 md:p-8 overflow-hidden font-[Agenda,sans-serif]">
      
      {/* --- LEFT COLUMN: Logo, Info, Timer --- */}
      <div className="flex-1 flex flex-col justify-between max-w-xl relative z-10 pb-20 md:pb-0">
        
        {/* Top: Logo & Description */}
        <div className="space-y-6 mt-4 md:mt-8 pl-4">
            {/* Logo */}
            <div className="w-64 md:w-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/login-logo.png" alt="WTN Logo" className="w-full h-auto" />
            </div>
            
            {/* Description Text */}
            <p className="text-[#333132] text-lg md:text-xl max-w-md font-medium leading-relaxed">
                Answer {totalQuestions} questions and get up to speed on news from Singapore and around the world.
            </p>
        </div>

        {/* Bottom: Timer Board */}
        <div className="mt-auto mb-8 pl-4 relative">
             {/* Placeholder Timer Styling - To be replaced by asset later */}
             <div className="bg-[#242F6B] text-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative overflow-visible">
                {/* Decorative Bolts (CSS Placeholder) */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-gray-500 rounded-full opacity-50"></div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-gray-500 rounded-full opacity-50"></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-gray-500 rounded-full opacity-50"></div>
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-gray-500 rounded-full opacity-50"></div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-1">Timer</p>
                        <div 
                            className="text-6xl font-bold leading-none tabular-nums"
                            style={{ fontFamily: 'var(--font-parkinsans), sans-serif' }}
                        >
                             {timeRemaining !== null ? formatTime(timeRemaining) : "00:00"}
                        </div>
                    </div>
                    {/* Clock Icon Placeholder */}
                    <div className="text-4xl">⏱️</div> 
                </div>
             </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: Question Card --- */}
      <div className="flex-[1.5] flex items-center justify-center relative z-10 p-4">
        
        {/* Main Question Card */}
        <Card className="w-full max-w-2xl bg-white !bg-white rounded-[40px] shadow-2xl border-0 overflow-hidden relative">
            <CardContent className="p-8 md:p-10 space-y-6">
                
                {/* 1. Question Image */}
                {currentQuestion.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={currentQuestion.image_url} 
                            alt="Question Reference" 
                            className="w-full h-64 object-cover"
                        />
                    </div>
                )}

                {/* 2. Label & Text */}
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        QUESTION {String(currentQuestionIndex + 1).padStart(2, '0')} - {totalQuestions}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#333132] leading-tight">
                        {currentQuestion.text}
                    </h2>
                </div>

                {/* 3. Options (A, B, C...) */}
                <div className="grid grid-cols-1 gap-4 pt-2">
                    {currentQuestion.options.map((option, idx) => {
                        const letters = ['A', 'B', 'C', 'D', 'E'];
                        const letter = letters[idx] || '?';
                        const isSelected = selectedOption === option;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(option)}
                                className={cn(
                                    "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group",
                                    isSelected 
                                        ? 'border-[#F38133] bg-orange-50 shadow-md' 
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                {/* Circle Letter Indicator */}
                                <div className={cn(
                                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-colors",
                                    isSelected
                                        ? "bg-[#F38133] border-[#F38133] text-white"
                                        : "bg-white border-[#F38133] text-[#F38133]"
                                )}>
                                    {letter}
                                </div>
                                
                                {/* Option Text */}
                                <span className={cn(
                                    "text-lg font-medium",
                                    isSelected ? 'text-[#333132]' : 'text-gray-600'
                                )}>
                                    {option}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 4. Action Button (Hidden until selected?) or Visible? Keeping visible for now */}
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleNext}
                    disabled={!selectedOption}
                    className={cn(
                        "rounded-full px-8 h-12 text-lg font-bold transition-all shadow-lg",
                        selectedOption 
                            ? "bg-[#F38133] hover:bg-[#d9722b] text-white transform active:scale-95" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {currentQuestionIndex === totalQuestions - 1 ? 'FINISH EXAM' : 'NEXT QUESTION'}
                  </Button>
                </div>

            </CardContent>
        </Card>
      </div>

      {/* --- TOP RIGHT: Rule Violations (Absolute) --- */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <div className="bg-white rounded-full px-4 py-2 shadow-md border border-gray-100 flex items-center gap-3">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wide">
                <span className="text-lg">⚠️</span> Rule Violations
            </div>
            {/* Flags */}
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative">
                     {/* Placeholder Flag Icon */}
                     <svg 
                        width="20" height="20" viewBox="0 0 24 24" 
                        fill={strikeCount >= i ? "#EF4444" : "#E5E7EB"} // Red if struck, Gray if safe
                        xmlns="http://www.w3.org/2000/svg"
                     >
                        <path d="M14.4 6L14 4H5V21H7V14H12.6L13 16H20V6H14.4Z" />
                     </svg>
                </div>
              ))}
            </div>
        </div>
      </div>

    </div>
  );

}