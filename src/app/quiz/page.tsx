"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import questionsData from '@/data/questions.json';

type Question = {
  qid: string;
  difficulty: string;
  text: string;
  options: string[];
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

export default function QuizPage() {
  const router = useRouter();
  
  // Initialize quiz with randomized questions and options
  // This runs only once on mount (lazy initialization)
  const [quizQuestions] = useState<Question[]>(() => {
    const easy = questionsData.filter(q => q.difficulty === 'Easy');
    const medium = questionsData.filter(q => q.difficulty === 'Medium');
    const hard = questionsData.filter(q => q.difficulty === 'Hard');

    // Shuffle questions within each bucket
    const shuffledQuestions = [
      ...shuffle(easy),
      ...shuffle(medium),
      ...shuffle(hard)
    ];

    // Shuffle options for each question
    return shuffledQuestions.map(q => ({
      ...q,
      options: shuffle(q.options)
    }));
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const { strikeCount } = useAntiCheat({
    onDisqualify: () => {
      router.push('/disqualified');
    },
  });

  // Effect to handle strike warnings
  useEffect(() => {
    if (strikeCount > 0 && strikeCount < 3) {
      setShowWarningModal(true);
    }
  }, [strikeCount]);

  // Guard against empty data
  if (!quizQuestions.length) {
    return <div className="p-8 text-center">Loading quiz...</div>;
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalQuestions = quizQuestions.length;

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!selectedOption) return;

    // Save response
    const newResponses = { ...responses, [currentQuestion.qid]: selectedOption };
    setResponses(newResponses);
    
    // Reset selection
    setSelectedOption(null);

    // Move to next question or finish
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Finished
      console.log("Final Responses:", newResponses); 
      router.push('/results');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col items-center py-10 px-4 select-none">
      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-2xl max-w-md w-full text-center border-2 border-red-500">
            <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ WARNING!</h2>
            <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
              Do not leave the exam! You have {strikeCount} strike(s).
              <br />
              <span className="font-bold">3 strikes will result in immediate disqualification.</span>
            </p>
            <button 
              onClick={() => setShowWarningModal(false)}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl bg-white dark:bg-zinc-800 rounded-xl shadow-lg overflow-hidden">
        {/* Header: Progress & Strikes */}
        <div className="bg-gray-100 dark:bg-zinc-900/50 p-6 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-zinc-700">
          <div className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-4 sm:mb-0">
            Question <span className="text-black dark:text-white text-xl">{currentQuestionIndex + 1}</span> of {totalQuestions}
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
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase 
              ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="grid gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(option)}
                className={`w-full text-left p-5 rounded-lg border-2 transition-all duration-200 group flex items-center justify-between
                  ${selectedOption === option 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md transform scale-[1.01]' 
                    : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                  }`}
              >
                <span className={`text-lg font-medium ${selectedOption === option ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
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
          <button
            onClick={handleNext}
            disabled={!selectedOption}
            className={`px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-all transform
              ${!selectedOption 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
              }`}
          >
            {currentQuestionIndex === totalQuestions - 1 ? 'Finish Exam' : 'Confirm & Next'}
          </button>
        </div>
      </div>
    </div>
  );
}