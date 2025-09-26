import EditorModeTitle from "./EditorModeTitle";
import MonacoEditor, { type ErrorInfo } from "./MonacoEditor";
import ShellPanel from "./ShellPanel";

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
  const headerRight = error?.line ? (
    <span
      className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded"
      data-testid="tokenscript-editor-error"
    >
      Error on line {error.line}
    </span>
  ) : undefined;

  const title = (
    <EditorModeTitle
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
      testId={
        inputMode && onInputModeChange ? "input-mode-dropdown" : "tokenscript-editor-language"
      }
      defaultLabel="tokenscript"
    />
  );

  return (
    <ShellPanel
      title={title}
      headerRight={headerRight}
      className={`h-full ${className}`}
      data-testid="tokenscript-editor"
      ShellTitle={({ children }) => children}
    >
      <MonacoEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
        language="tokenscript"
        theme="tokenscript-theme"
      />
    </ShellPanel>
  );
}

export default TokenScriptEditor;
