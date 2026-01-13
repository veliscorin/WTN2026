"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewItem {
  qid: string;
  text: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface ResultsData {
  score: number;
  total: number;
  review: ReviewItem[];
}

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function fetchResults() {
      const email = localStorage.getItem('wtn_user_email');
      if (!email) {
        router.push('/');
        return;
      }
      setUserEmail(email);

      try {
        const res = await fetch(`/api/quiz/results?email=${email}`);
        if (!res.ok) {
          throw new Error('Failed to fetch results.');
        }
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        setError('Error loading results. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [router]);

  const handleExit = () => {
      localStorage.removeItem('wtn_user_email');
      localStorage.removeItem('wtn_school_id');
      localStorage.removeItem('wtn_school_name');
      router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="ml-3 text-lg font-medium text-gray-600 dark:text-gray-300">Processing Results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
        <Card className="border-red-500 max-w-md w-full">
            <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const percentage = Math.round((data.score / data.total) * 100) || 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Score Card */}
        <Card className="border-0 shadow-lg md:border bg-white dark:bg-zinc-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">Exam Completed</CardTitle>
            <div className="flex flex-col items-center gap-1 mt-1">
                <CardDescription className="text-lg">Performance Summary</CardDescription>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded">
                    {userEmail}
                </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border-4 border-indigo-500">
                <div className="text-center">
                    <span className="block text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">{data.score}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">out of {data.total}</span>
                </div>
            </div>
            <p className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">
                Score: {percentage}%
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                A copy of these results has been emailed to you.
            </p>
          </CardContent>
        </Card>

        {/* Review Table */}
        <Card className="border-0 shadow-lg md:border bg-white dark:bg-zinc-800">
            <CardHeader>
                <CardTitle>Detailed Review</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3 rounded-tl-lg">Status</th>
                                <th className="px-6 py-3">Question</th>
                                <th className="px-6 py-3">Your Answer</th>
                                <th className="px-6 py-3 rounded-tr-lg">Correct Answer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.review.map((item) => (
                                <tr key={item.qid} className="bg-white border-b dark:bg-zinc-800 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                                    <td className="px-6 py-4">
                                        {item.isCorrect ? (
                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-500" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-md truncate" title={item.text}>
                                        {item.text}
                                    </td>
                                    <td className={cn(
                                        "px-6 py-4 font-semibold",
                                        item.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                        {item.yourAnswer}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        {item.correctAnswer}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
            <Button onClick={handleExit} size="lg" variant="outline">
                Return to Home
            </Button>
        </div>

      </div>
    </div>
  );
}
