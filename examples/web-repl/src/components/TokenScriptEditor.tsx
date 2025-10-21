import { useAtom } from "jotai";
import { inputsPanelCollapsedAtom } from "../store/atoms";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import InputsPanel from "./InputsPanel";
import MonacoEditor, { type ErrorInfo } from "./MonacoEditor";

interface TokenScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
  onReferencesChange?: (references: Record<string, any>) => void;
}

function TokenScriptEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  onReferencesChange,
}: TokenScriptEditorProps) {
  const [inputsPanelCollapsed, _setInputsPanelCollapsed] = useAtom(inputsPanelCollapsedAtom);
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const monacoTheme = theme === "light" ? "tokenscript-theme-light" : "tokenscript-theme-dark";

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{ backgroundColor: currentTheme.editorBackground }}
      data-testid="tokenscript-editor"
    >
      {/* Inputs Panel */}
      {!inputsPanelCollapsed && (
        <div
          className="p-3 border-b"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
          }}
        >
          <InputsPanel
            onInputsChange={onReferencesChange}
            initialInputs={[]}
          />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          error={error}
          language="tokenscript"
          theme={monacoTheme}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default TokenScriptEditor;
