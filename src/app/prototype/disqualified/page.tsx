"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DisqualifiedPage() {
  const router = useRouter();

  const handleExit = () => {
      localStorage.removeItem('wtn_user_email');
      localStorage.removeItem('wtn_school_id');
      localStorage.removeItem('wtn_school_name');
      router.push('/prototype');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="max-w-md w-full border-2 border-red-600 shadow-2xl bg-white dark:bg-zinc-900">
        <CardHeader className="text-center flex flex-col items-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
          <CardTitle className="text-3xl font-bold text-red-700 dark:text-red-500">
            DISQUALIFIED
          </CardTitle>
          <CardDescription className="text-lg font-medium text-red-600/80 dark:text-red-400">
            Exam Terminated
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-700 dark:text-gray-300">
            You have exceeded the maximum number of allowed strikes (3).
            System security protocols have flagged your session.
          </p>
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-md text-sm text-red-800 dark:text-red-200 font-mono">
            Code: ANTI_CHEAT_VIOLATION_MAX_STRIKES
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please report to the chief invigilator immediately.
          </p>

          <Button 
            onClick={handleExit}
            variant="outline" 
            className="w-full mt-4"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
