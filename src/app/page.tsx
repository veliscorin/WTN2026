"use client";

import { useState } from 'react';
import { useAntiCheat } from '@/hooks/useAntiCheat';

export default function Home() {
  const [isDisqualified, setIsDisqualified] = useState(false);

  const { strikeCount } = useAntiCheat({
    onDisqualify: () => {
      setIsDisqualified(true);
    },
  });

  if (isDisqualified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-red-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-4">Disqualified</h1>
        <p className="text-xl text-center">
          You have exceeded the maximum number of allowed tab switches (3).
          Your exam has been terminated.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 p-4 font-sans">
      <main className="max-w-2xl w-full bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Quiz Session Active
        </h1>
        
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Anti-Cheating Active
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            Please keep this tab focused. Switching tabs or leaving the exam window will result in strikes.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
            Current Strikes:
          </div>
          <div className={`text-6xl font-bold ${
            strikeCount === 0 ? 'text-green-500' :
            strikeCount === 1 ? 'text-yellow-500' :
            strikeCount === 2 ? 'text-orange-500' :
            'text-red-500'
          }`}>
            {strikeCount} / 3
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            (3 Strikes = Disqualification)
          </div>
        </div>
      </main>
    </div>
  );
}