import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
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
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const monacoTheme = theme === "light" ? "tokenscript-theme-light" : "tokenscript-theme-dark";

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{ backgroundColor: currentTheme.editorBackground }}
      data-testid="json-editor"
    >
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          language="json"
          theme={monacoTheme}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default JsonTokenEditor;
