import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dark:focus:ring-indigo-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
          <svg
            className="h-3 w-3 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 19L5 8H19L12 19Z" 
              fill="#333132" 
              stroke="#333132" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
