import type { ReactNode } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  showCheckmarks?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  showCheckmarks = true,
  className = "",
  testId,
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <style>
        {`
          .customizable-select,
          .customizable-select::picker(select) {
            appearance: base-select;
          }

          .customizable-select {
            border: 1px solid #52525b;
            background: #27272a;
            border-radius: 0.375rem;
            padding: 0.25rem 0.75rem 0.25rem 0.375rem;
            font-size: 0.75rem;
            font-weight: 500;
            color: #d4d4d8;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 120px;
          }

          .customizable-select:hover {
            background: #3f3f46;
            border-color: #71717a;
          }

          .customizable-select:focus {
            outline: none;
            ring: 2px;
            ring-color: #71717a;
            border-color: #71717a;
          }

          .customizable-select::picker(select) {
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
            padding: 0.5rem 0;
            margin-top: 0.25rem;
            min-width: max-content;
            max-height: 300px;
            overflow-y: auto;
            top: anchor(bottom, 4px);
            left: anchor(left);
          }

          .customizable-select option {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            color: #d4d4d8;
            cursor: pointer;
            transition: background-color 0.15s ease;
          }

          .customizable-select option:hover {
            background-color: #3f3f46;
          }

          .customizable-select option:checked {
            background-color: #52525b;
            color: #fafafa;
            font-weight: 500;
          }

          ${
            showCheckmarks
              ? `
          .customizable-select option::checkmark {
            content: '✓';
            color: #1d4ed8;
            font-weight: bold;
            width: 1rem;
            height: 1rem;
            margin-right: 0.5rem;
          }
          `
              : `
          .customizable-select option::checkmark {
            width: 0;
            margin: 0;
          }
          `
          }

          .customizable-select::picker-icon {
            display: none;
          }

          @supports not (appearance: base-select) {
            .customizable-select {
              appearance: none;
              background: #27272a;
              padding-right: 2rem;
            }
          }

          .customizable-select:open {
            border-color: #71717a;
            box-shadow: 0 0 0 2px rgba(113, 113, 122, 0.1);
          }

          .customizable-select::picker(select) {
            transition: opacity 0.2s ease, transform 0.2s ease;
          }

          @starting-style {
            .customizable-select::picker(select) {
              opacity: 0;
              transform: translateY(-10px);
            }
          }
        `}
      </style>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="customizable-select"
        data-testid={testId}
      >
        {placeholder && (
          <option
            value=""
            hidden
          >
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="custom-arrow pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </div>
  );
}

export default Select;
export type { SelectOption, SelectProps };
