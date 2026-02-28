"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const LoaderThree = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="w-4 h-4 rounded-full bg-accent-gold absolute top-0 left-1/2 -translate-x-1/2 animate-[bounce_1s_ease-in-out_infinite]" />
        </div>
        <div className="absolute top-0 left-0 w-full h-full rotate-120">
          <div className="w-4 h-4 rounded-full bg-accent-gold absolute top-0 left-1/2 -translate-x-1/2 animate-[bounce_1s_ease-in-out_0.33s_infinite]" />
        </div>
        <div className="absolute top-0 left-0 w-full h-full rotate-240">
          <div className="w-4 h-4 rounded-full bg-accent-gold absolute top-0 left-1/2 -translate-x-1/2 animate-[bounce_1s_ease-in-out_0.66s_infinite]" />
        </div>
      </div>
    </div>
  );
};

export const LoaderOne = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-12 h-12 border-4 border-gray-700 border-t-accent-gold rounded-full animate-spin" />
    </div>
  );
};

export const LoaderTwo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div className="w-3 h-3 bg-accent-gold rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
      <div className="w-3 h-3 bg-accent-gold rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
      <div className="w-3 h-3 bg-accent-gold rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
    </div>
  );
};
