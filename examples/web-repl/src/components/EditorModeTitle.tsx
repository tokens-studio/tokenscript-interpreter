import TitleBarComboBox from "./TitleBarComboBox";

interface EditorModeTitleProps {
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  testId?: string;
  defaultLabel: string;
}

const INPUT_MODE_OPTIONS = [
  { value: "tokenscript", label: "Script" },
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
      <TitleBarComboBox
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
