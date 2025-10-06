import type { Preset } from "../utils/presets";
import EditorModeTitle from "./EditorModeTitle";
import MonacoEditor from "./MonacoEditor";
import PresetSelector from "./PresetSelector";
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
  onPresetSelect?: (preset: Preset) => void;
}

function JsonTokenEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  inputMode,
  onInputModeChange,
  onPresetSelect,
}: JsonTokenEditorProps) {
  const title = (
    <EditorModeTitle
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
      testId={inputMode && onInputModeChange ? "input-mode-dropdown" : "json-editor-language"}
      defaultLabel="json"
    />
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
