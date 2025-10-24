import CleanSelect from "./CleanSelect";

interface EditorModeTitleProps {
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  testId?: string;
  defaultLabel: string;
}

const INPUT_MODE_OPTIONS = [
  { value: "tokenscript", label: "tokenscript" },
  { value: "json", label: "json" },
];

function EditorModeTitle({
  inputMode,
  onInputModeChange,
  testId,
  defaultLabel,
}: EditorModeTitleProps) {
  if (inputMode && onInputModeChange) {
    return (
      <CleanSelect
        value={inputMode}
        onChange={onInputModeChange}
        options={INPUT_MODE_OPTIONS}
        testId={testId || "editor-mode-dropdown"}
      />
    );
  }
  return <span data-testid={testId || "editor-mode-language"}>{defaultLabel}</span>;
}

export default EditorModeTitle;
