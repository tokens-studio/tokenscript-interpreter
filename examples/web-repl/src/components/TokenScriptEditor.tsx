import type { Preset } from "../utils/presets";
import EditorModeTitle from "./EditorModeTitle";
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
}: TokenScriptEditorProps) {
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
