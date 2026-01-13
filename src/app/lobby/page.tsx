"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function LobbyPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState('Syncing with server...');
  const [offset, setOffset] = useState<number>(0);
  const [sessionName, setSessionName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const schoolId = localStorage.getItem('wtn_school_id');
        const email = localStorage.getItem('wtn_user_email');

        if (!schoolId || !email) {
          router.push('/');
          return;
        }
        setUserEmail(email);

        // 1. Get Session Info
        const sessionRes = await fetch(`/api/session?schoolId=${schoolId}`);
        if (!sessionRes.ok) {
           throw new Error('Session not found');
        }
        const sessionData = await sessionRes.json();

        // 2. Check User Status
        const stateRes = await fetch(`/api/quiz/state?email=${userEmail}`);
        if (stateRes.ok) {
            const state = await stateRes.json();
            if (state.status === 'COMPLETED') {
                router.push('/results');
                return;
            }
            if (state.status === 'DISQUALIFIED' || state.is_disqualified) {
                router.push('/disqualified');
                return;
            }
        }

        // 3. Sync Clock (Simple implementation)
        const startTime = new Date(sessionData.startTime).getTime();
        setSessionName(sessionData.name || 'Academic Quiz Session');

        const t0 = Date.now();
        const timeRes = await fetch('/api/time');
        const timeData = await timeRes.json();
        const t1 = Date.now();
        const latency = t1 - t0;
        const serverTime = timeData.time + (latency / 2);
        const clockOffset = serverTime - t1; // Add this to local Date.now() to get Server Time
        setOffset(clockOffset);

        // 4. CHECK: If already started, go straight to Quiz
        const currentServerTime = Date.now() + clockOffset;
        if (currentServerTime >= startTime) {
           router.push('/quiz');
           return;
        }

        setStatus('Waiting for session to start...');

        // 3. Start Timer Loop
        const intervalId = setInterval(() => {
          const currentServerTime = Date.now() + clockOffset;
          const remaining = startTime - currentServerTime;

          if (remaining <= 0) {
            clearInterval(intervalId);
            router.push('/quiz');
          } else {
            setTimeLeft(remaining);
          }
        }, 100);

        return () => clearInterval(intervalId);

      } catch (err) {
        setStatus('Error connecting to server.');
      }
    }

    init();
  }, [router]);

  // Format milliseconds to MM:SS or HH:MM:SS
  const formatTime = (ms: number) => {
    if (ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [
        hours > 0 ? hours.toString().padStart(2, '0') : null,
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].filter(Boolean);

    return parts.join(':');
  };

  const handleLogout = () => {
    localStorage.removeItem('wtn_user_email');
    localStorage.removeItem('wtn_school_id');
    localStorage.removeItem('wtn_school_name');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg md:border">
        <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                LOBBY
            </CardTitle>
            <div className="flex flex-col items-center gap-1">
                <CardDescription className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {sessionName}
                </CardDescription>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    {userEmail}
                </span>
            </div>
        </CardHeader>

        <CardContent className="text-center space-y-8">
            <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">
                    Starting In
                </p>
                
                {timeLeft !== null ? (
                    <div className="relative inline-block">
                        <div className="text-6xl sm:text-7xl font-mono font-bold tabular-nums text-gray-900 dark:text-white tracking-tighter">
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                ) : (
                    <div className="h-20 flex items-center justify-center text-gray-400 animate-pulse">
                        Syncing Time...
                    </div>
                )}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold">{status}</p>
                <p className="mt-2 text-xs opacity-80">
                    Please do not refresh the page. <br/>
                    You will be automatically redirected.
                </p>
            </div>

            <button 
                onClick={handleLogout}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline transition-colors"
            >
                Wrong account? Logout
            </button>
        </CardContent>
      </Card>
    </div>
  );
}
