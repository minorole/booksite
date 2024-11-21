"use client"

import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: string;
  isProcessing: boolean;
}

export function ProgressIndicator({ currentStep, isProcessing }: ProgressIndicatorProps) {
  if (!isProcessing) return null;
  
  return (
    <div className={cn(
      "absolute bottom-24 left-0 right-0 px-4",
      "flex justify-center items-center",
      "transition-opacity duration-200",
      isProcessing ? "opacity-100" : "opacity-0"
    )}>
      <div className="bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm">
        {currentStep}
      </div>
    </div>
  );
} 