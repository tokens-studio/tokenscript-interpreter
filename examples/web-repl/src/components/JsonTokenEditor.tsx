import MonacoEditor from "./MonacoEditor";

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
}

function JsonTokenEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
}: JsonTokenEditorProps) {
  return (
    <div
      className={`h-full flex flex-col bg-zinc-900 ${className}`}
      data-testid="json-editor"
    >
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          language="json"
          theme="tokenscript-theme"
          className="h-full"
        />
      </div>
    </div>
  );
}

export default JsonTokenEditor;
