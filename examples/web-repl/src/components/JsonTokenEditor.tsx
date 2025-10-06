import EditorModeTitle from "./EditorModeTitle";
import MonacoEditor from "./MonacoEditor";
import ShellPanel from "./ShellPanel";

export interface JsonErrorInfo {
  message: string;
  line?: number;
}

interface JsonTokenEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: string;
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
}

function JsonTokenEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  inputMode,
  onInputModeChange,
}: JsonTokenEditorProps) {
  const title = (
    <EditorModeTitle
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
      testId={inputMode && onInputModeChange ? "input-mode-dropdown" : "json-editor-language"}
      defaultLabel="json"
    />
  );

  return (
    <ShellPanel
      title={title}
      className={`h-full ${className}`}
      data-testid="json-editor"
      ShellTitle={({ children }) => children}
    >
      <MonacoEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        language="json"
        theme="tokenscript-theme"
      />
    </ShellPanel>
  );
}

export default JsonTokenEditor;
