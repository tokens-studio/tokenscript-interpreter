import MonacoEditor, { type ErrorInfo } from "./MonacoEditor";

interface TokenScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
}

function TokenScriptEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
}: TokenScriptEditorProps) {
  return (
    <MonacoEditor
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      error={error}
    />
  );
}

export default TokenScriptEditor;
