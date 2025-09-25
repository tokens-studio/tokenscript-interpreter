import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import EditorModeTitle from "./EditorModeTitle";
import {
  tokenscriptLanguageConfig,
  tokenscriptLanguageDefinition,
} from "./monaco-tokenscript-lang";
import ShellPanel from "./ShellPanel";
import { monacoThemeDefinition } from "./shared-theme";
import { TokenScriptCompletionProvider } from "./tokenscript-completion-provider";

export interface ErrorInfo {
  message: string;
  line?: number;
  token?: any;
}

export interface ValidationError {
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
  validationErrors?: ValidationError[];
  inputMode?: "tokenscript" | "json";
  onInputModeChange?: (mode: "tokenscript" | "json") => void;
  language?: string;
  theme?: string;
  options?: any;
}

export const options = {
  fontSize: 13,
  lineNumbers: "on",
  lineNumbersMinChars: 2,
  minimap: { enabled: false },
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollBeyondLastLine: false,
  wordWrap: "on",
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  folding: true,
  glyphMargin: false,
  scrollbar: {
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
    arrowSize: 0,
    useShadows: false,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    handleMouseWheel: true,
  },
};

export const jsonEditorOptions = {
  ...options,
  stickyScroll: { enabled: false },
};

function MonacoEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
  validationErrors = [],
  inputMode,
  onInputModeChange,
  language = "tokenscript",
  theme = "tokenscript-theme",
  options: customOptions,
}: MonacoEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<TokenScriptCompletionProvider | null>(null);
  const languageRegisteredRef = useRef<boolean>(false);
  const completionProviderDisposableRef = useRef<{ dispose(): void } | null>(null);

  // Register TokenScript language
  useEffect(() => {
    if (monaco && !languageRegisteredRef.current) {
      monaco.languages.register({ id: "tokenscript" });
      monaco.languages.setLanguageConfiguration("tokenscript", tokenscriptLanguageConfig);
      monaco.languages.setMonarchTokensProvider("tokenscript", tokenscriptLanguageDefinition);
      monaco.editor.defineTheme("tokenscript-theme", monacoThemeDefinition);

      languageRegisteredRef.current = true;
    }
  }, [monaco]);

  // Register completion provider
  useEffect(() => {
    if (monaco) {
      // Dispose existing provider first
      if (completionProviderDisposableRef.current) {
        completionProviderDisposableRef.current.dispose();
      }

      // Register new provider
      completionProviderRef.current = new TokenScriptCompletionProvider();
      const disposable = monaco.languages.registerCompletionItemProvider("tokenscript", {
        provideCompletionItems: (model, position) => {
          return completionProviderRef.current?.provideCompletionItems(model, position);
        },
        triggerCharacters: [".", " "],
      });
      completionProviderDisposableRef.current = disposable;

      // Set theme each time
      monaco.editor.setTheme("tokenscript-theme");
    }

    // Cleanup function to dispose completion provider
    return () => {
      if (completionProviderDisposableRef.current) {
        completionProviderDisposableRef.current.dispose();
        completionProviderDisposableRef.current = null;
      }
    };
  }, [monaco]);

  // Handle error markers and validation errors
  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Always clear existing markers first
        monaco.editor.setModelMarkers(model, "tokenscript", []);

        const markers: editor.IMarkerData[] = [];

        // Add error marker only if error exists with line number
        if (error?.line) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: error.message,
            startLineNumber: error.line,
            startColumn: 1,
            endLineNumber: error.line,
            endColumn: Number.MAX_SAFE_INTEGER,
          });
        }

        // Add validation error markers
        for (const validationError of validationErrors) {
          if (validationError.line) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              message: validationError.message,
              startLineNumber: validationError.line,
              startColumn: validationError.column || 1,
              endLineNumber: validationError.line,
              endColumn: validationError.column
                ? validationError.column + 10
                : Number.MAX_SAFE_INTEGER,
            });
          }
        }

        if (markers.length > 0) {
          monaco.editor.setModelMarkers(model, "tokenscript", markers);
        }
      }
    }
  }, [monaco, error, validationErrors]);

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

    // Force theme application
    if (monaco) {
      monaco.editor.setTheme("tokenscript-theme");
    }

    // Set focus to editor
    editor.focus();

    // Configure editor options
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
      data-testid="monaco-editor-error"
    >
      Error on line {error.line}
    </span>
  ) : undefined;

  const title = (
    <EditorModeTitle
      inputMode={inputMode}
      onInputModeChange={onInputModeChange}
      testId={inputMode && onInputModeChange ? "input-mode-dropdown" : "monaco-editor-language"}
      defaultLabel="tokenscript"
    />
  );

  return (
    <ShellPanel
      title={title}
      headerRight={headerRight}
      className={`h-full ${className}`}
      data-testid="monaco-editor"
      ShellTitle={({ children }) => children}
    >
      <div
        className="h-full"
        data-testid="monaco-editor-container"
      >
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={customOptions || options}
          data-testid="monaco-editor-instance"
        />
      </div>
    </ShellPanel>
  );
}

export default MonacoEditor;
