import { useAtom } from "jotai";
import { inputsPanelCollapsedAtom } from "../store/atoms";
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

  return (
    <div
      className={`h-full flex flex-col bg-zinc-900 ${className}`}
      data-testid="tokenscript-editor"
    >
      {/* Inputs Panel */}
      {!inputsPanelCollapsed && (
        <div className="p-3 bg-zinc-900/50 border-b border-zinc-800">
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
          theme="tokenscript-theme"
          className="h-full"
        />
      </div>
    </div>
  );
}

export default TokenScriptEditor;
