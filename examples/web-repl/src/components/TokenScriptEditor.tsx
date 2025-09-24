import MonacoEditor, { type ErrorInfo } from "./MonacoEditor";

interface TokenScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
}

function TokenScriptEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  inputMode,
  onInputModeChange,
}: TokenScriptEditorProps) {
  return (
    <MonacoEditor
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      error={error}
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
    />
  );
}

export default TokenScriptEditor;
