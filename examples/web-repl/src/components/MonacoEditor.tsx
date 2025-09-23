import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import {
  tokenscriptLanguageConfig,
  tokenscriptLanguageDefinition,
} from "./monaco-tokenscript-lang";
import { monacoThemeDefinition } from "./shared-theme";
import { TokenScriptCompletionProvider } from "./tokenscript-completion-provider";

export interface ErrorInfo {
  message: string;
  line?: number;
  token?: any;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
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

function MonacoEditor({ value, onChange, onKeyDown, className = "", error }: MonacoEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<TokenScriptCompletionProvider | null>(null);
  const themeRegisteredRef = useRef<boolean>(false);

  // Register TokenScript language
  useEffect(() => {
    if (monaco) {
      if (!themeRegisteredRef.current) {
        monaco.languages.register({ id: "tokenscript" });
        monaco.languages.setLanguageConfiguration("tokenscript", tokenscriptLanguageConfig);
        monaco.languages.setMonarchTokensProvider("tokenscript", tokenscriptLanguageDefinition);

        completionProviderRef.current = new TokenScriptCompletionProvider();
        monaco.languages.registerCompletionItemProvider("tokenscript", {
          provideCompletionItems: (model, position) => {
            return completionProviderRef.current?.provideCompletionItems(model, position);
          },
          triggerCharacters: [".", " "],
        });
      }

      monaco.editor.defineTheme("tokenscript-theme", monacoThemeDefinition);

      monaco.editor.setTheme("tokenscript-theme");
      themeRegisteredRef.current = true;
    }
  }, [monaco]);

  // Handle error markers
  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Always clear existing markers first
        monaco.editor.setModelMarkers(model, "tokenscript", []);

        // Add error marker only if error exists with line number
        if (error?.line) {
          const markers: editor.IMarkerData[] = [
            {
              severity: monaco.MarkerSeverity.Error,
              message: error.message,
              startLineNumber: error.line,
              startColumn: 1,
              endLineNumber: error.line,
              endColumn: Number.MAX_SAFE_INTEGER,
            },
          ];

          monaco.editor.setModelMarkers(model, "tokenscript", markers);
        }
      }
    }
  }, [monaco, error]);

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

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border shadow-sm h-full ${className}`}
      data-testid="monaco-editor"
    >
      <div className="border-b bg-gray-50 px-3 sm:px-4 py-2 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center justify-between h-full w-full">
          <div
            className="text-xs sm:text-sm text-gray-600 font-mono truncate pr-2"
            data-testid="monaco-editor-language"
          >
            tokenscript
          </div>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0">{headerRight}</div>}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 rounded-b-lg overflow-auto"
        data-testid="monaco-editor-container"
      >
        <Editor
          height="100%"
          language="tokenscript"
          theme="tokenscript-theme"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={options}
          data-testid="monaco-editor-instance"
        />
      </div>
    </div>
  );
}

export default MonacoEditor;
