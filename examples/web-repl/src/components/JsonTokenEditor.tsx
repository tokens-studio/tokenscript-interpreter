import { useCallback, useEffect, useState } from "react";
import EditorModeTitle from "./EditorModeTitle";
import MonacoEditor, { type ValidationError } from "./MonacoEditor";
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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Convert JSON parsing error to ValidationError format
  const convertJsonErrorToValidation = useCallback((jsonError: unknown): ValidationError => {
    const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
    let lineNumber = 1;

    // Try to extract line number from error message patterns
    const lineMatch =
      errorMessage.match(/at line (\d+)/i) ||
      errorMessage.match(/line (\d+)/i) ||
      errorMessage.match(/position (\d+)/);

    if (lineMatch) {
      lineNumber = parseInt(lineMatch[1], 10);
    }

    return {
      message: errorMessage,
      line: lineNumber,
      column: 1,
    };
  }, []);

  // Validate JSON and set validation errors
  useEffect(() => {
    if (error && value.trim()) {
      try {
        JSON.parse(value);
        setValidationErrors([]);
      } catch (jsonError) {
        setValidationErrors([convertJsonErrorToValidation(jsonError)]);
      }
    } else {
      setValidationErrors([]);
    }
  }, [value, error, convertJsonErrorToValidation]);

  const headerRight = error ? (
    <span
      className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded"
      data-testid="json-editor-error"
    >
      Invalid JSON
    </span>
  ) : undefined;

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
      headerRight={headerRight}
      className={`h-full ${className}`}
      data-testid="json-editor"
      ShellTitle={({ children }) => children}
    >
      <MonacoEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        validationErrors={validationErrors}
        language="json"
        theme="tokenscript-theme"
      />
    </ShellPanel>
  );
}

export default JsonTokenEditor;
