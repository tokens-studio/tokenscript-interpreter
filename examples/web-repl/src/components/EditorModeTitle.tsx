import TitleBarSelect from "./TitleBarSelect";

interface EditorModeTitleProps {
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  testId?: string;
  defaultLabel: string;
}

const INPUT_MODE_OPTIONS = [
  { value: "tokenscript", label: "Tokenscript" },
  { value: "json", label: "JSON" },
];

function EditorModeTitle({
  inputMode,
  onInputModeChange,
  testId,
  defaultLabel,
}: EditorModeTitleProps) {
  if (inputMode && onInputModeChange) {
    return (
      <TitleBarSelect
        label="Input"
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
