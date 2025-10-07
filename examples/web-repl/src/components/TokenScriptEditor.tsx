import { useAtom } from "jotai";
import { inputsPanelCollapsedAtom } from "../store/atoms";
import type { Preset } from "../utils/presets";
import EditorModeTitle from "./EditorModeTitle";
import InputsPanel from "./InputsPanel";
import MonacoEditor, { type ErrorInfo } from "./MonacoEditor";
import PresetSelector from "./PresetSelector";
import ShellPanel from "./ShellPanel";

interface TokenScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  onPresetSelect?: (preset: Preset) => void;
  onReferencesChange?: (references: Record<string, any>) => void;
}

function TokenScriptEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  inputMode,
  onInputModeChange,
  onPresetSelect,
  onReferencesChange,
}: TokenScriptEditorProps) {
  const [inputsPanelCollapsed, _setInputsPanelCollapsed] = useAtom(inputsPanelCollapsedAtom);

  const title = (
    <div className="flex items-center space-x-2">
      <EditorModeTitle
        inputMode={inputMode}
        onInputModeChange={onInputModeChange}
        testId={
          inputMode && onInputModeChange ? "input-mode-dropdown" : "tokenscript-editor-language"
        }
        defaultLabel="tokenscript"
      />
    </div>
  );

  const headerRight =
    onPresetSelect && inputMode ? (
      <PresetSelector
        inputMode={inputMode}
        onPresetSelect={onPresetSelect}
        testId="preset-selector"
      />
    ) : undefined;

  return (
    <ShellPanel
      title={title}
      headerRight={headerRight}
      className={`h-full ${className}`}
      data-testid="tokenscript-editor"
      ShellTitle={({ children }) => children}
    >
      {!inputsPanelCollapsed && (
        <div className="p-2 bg-gray-50 border-b">
          <InputsPanel
            onInputsChange={onReferencesChange}
            initialInputs={[]}
          />
        </div>
      )}
      <MonacoEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
        language="tokenscript"
        theme="tokenscript-theme"
        className={!inputsPanelCollapsed ? "h-[calc(100%-6rem)]" : "h-full"}
      />
    </ShellPanel>
  );
}

export default TokenScriptEditor;
