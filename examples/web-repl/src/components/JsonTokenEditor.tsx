import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import EditorModeTitle from "./EditorModeTitle";
import { options } from "./MonacoEditor";
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
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Handle JSON validation and error markers
  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Always clear existing markers first
        monaco.editor.setModelMarkers(model, "json", []);

        // Add error marker if JSON is invalid
        if (error) {
          try {
            JSON.parse(value);
          } catch (jsonError) {
            // Try to extract line number from JSON parse error
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

            const markers: editor.IMarkerData[] = [
              {
                severity: monaco.MarkerSeverity.Error,
                message: errorMessage,
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: Number.MAX_SAFE_INTEGER,
              },
            ];

            monaco.editor.setModelMarkers(model, "json", markers);
          }
        }
      }
    }
  }, [monaco, value, error]);

  // Setup keyboard event listener
  useEffect(() => {
    if (editorRef.current && onKeyDown) {
      const disposable = editorRef.current.onKeyDown((event) => {
        // Convert Monaco KeyboardEvent to standard KeyboardEvent
        const standardEvent = new KeyboardEvent("keydown", {
          key: event.browserEvent.key,
          code: event.browserEvent.code,
          ctrlKey: event.browserEvent.ctrlKey,
          shiftKey: event.browserEvent.shiftKey,
          altKey: event.browserEvent.altKey,
          metaKey: event.browserEvent.metaKey,
        });
        onKeyDown(standardEvent);
      });

      return () => disposable.dispose();
    }
  }, [onKeyDown]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.focus();
    editor.updateOptions(options);
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

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
      <Editor
        height="100%"
        language="json"
        theme="tokenscript-theme"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={options}
        data-testid="json-editor-instance"
      />
    </ShellPanel>
  );
}

export default JsonTokenEditor;
