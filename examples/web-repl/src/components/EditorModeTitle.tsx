interface EditorModeTitleProps {
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  testId?: string;
  defaultLabel: string;
}

function EditorModeTitle({
  inputMode,
  onInputModeChange,
  testId,
  defaultLabel,
}: EditorModeTitleProps) {
  if (inputMode && onInputModeChange) {
    return (
      <div className="relative flex items-center">
        <select
          value={inputMode}
          onChange={(e) => onInputModeChange(e.target.value as "tokenscript" | "json")}
          className="appearance-none bg-transparent border-none outline-none text-xs sm:text-sm text-gray-600 font-mono truncate pr-2 cursor-pointer pr-5"
          data-testid={testId || "editor-mode-dropdown"}
        >
          <option value="tokenscript">tokenscript</option>
          <option value="json">json</option>
        </select>
        <span className="pointer-events-none absolute right-1">
          <svg
            className="w-3 h-3 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
    );
  }
  return <span data-testid={testId || "editor-mode-language"}>{defaultLabel}</span>;
}

export default EditorModeTitle;
