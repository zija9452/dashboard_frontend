'use client';

import React, { useRef } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  // Back to page 1 on every search change and on Clear, so a search started on
  // page 10 doesn't ask for page 10 of the results. Required so it can't be forgotten.
  resetPage: () => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  inputClassName?: string;
  boxClassName?: string; // div around the input and the icon
  // Given: the box is wrapped in a div with this class, followed by a Clear button
  clearWrapperClassName?: string;
  clearLabel?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  resetPage,
  placeholder,
  id,
  autoFocus,
  inputClassName = 'regal-input w-full pl-10 pr-4 py-2',
  boxClassName = 'relative',
  clearWrapperClassName,
  clearLabel = 'Clear'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const box = (
    <div className={boxClassName}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          resetPage();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            resetPage();
          }
        }}
        className={inputClassName}
        autoFocus={autoFocus}
      />
      <svg
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );

  if (clearWrapperClassName === undefined) return box;

  return (
    <div className={clearWrapperClassName}>
      {box}
      <button
        className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
        onClick={() => {
          onChange('');
          resetPage();
          inputRef.current?.focus();
        }}
      >
        {clearLabel}
      </button>
    </div>
  );
};

export default SearchBox;
