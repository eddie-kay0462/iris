"use client";

import { useEffect, useRef, useState } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  }

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );
}
