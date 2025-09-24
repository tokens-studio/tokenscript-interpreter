import { ArrowDown } from "./icons";
import { DefaultShellTitle } from "./ShellPanel";

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
      <div className="flex h-full items-center">
        <DefaultShellTitle>Input</DefaultShellTitle>
        <div className="relative flex items-center h-full hover:bg-gray-100 border-l border-r border-solid border-gray-200">
          <DefaultShellTitle className="px-0">
            <select
              value={inputMode}
              onChange={(e) => onInputModeChange(e.target.value as "tokenscript" | "json")}
              className="h-full appearance-none font-bold bg-transparent border-none outline-none truncate cursor-pointer px-3 pr-10"
              data-testid={testId || "editor-mode-dropdown"}
            >
              <option value="tokenscript">Tokenscript</option>
              <option value="json">JSON</option>
            </select>
            <span className="pointer-events-none absolute right-1 pr-1">
              <ArrowDown />
            </span>
          </DefaultShellTitle>
        </div>
      </div>
    );
  }
  return <span data-testid={testId || "editor-mode-language"}>{defaultLabel}</span>;
}

export default EditorModeTitle;
