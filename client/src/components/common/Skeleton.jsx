import React from 'react';

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center space-x-4">
          <div className="h-10 w-10 rounded-full bg-slate-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 rounded bg-slate-200"></div>
            <div className="h-3 w-1/2 rounded bg-slate-100"></div>
          </div>
          <div className="h-6 w-20 rounded bg-slate-100"></div>
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-1/3 rounded bg-slate-200 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-slate-100"></div>
        <div className="h-4 w-5/6 rounded bg-slate-100"></div>
      </div>
    </div>
  );
};
