import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import { tokenscriptLanguageConfig, tokenscriptLanguageDefinition } from "./monaco-tokenscript-lang";
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

function MonacoEditor({ value, onChange, onKeyDown, className = "", error }: MonacoEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<TokenScriptCompletionProvider | null>(null);

  // Register TokenScript language
  useEffect(() => {
    if (monaco) {
      // Register the language
      monaco.languages.register({ id: "tokenscript" });

      // Set the language configuration
      monaco.languages.setLanguageConfiguration("tokenscript", tokenscriptLanguageConfig);

      // Set the tokenizer
      monaco.languages.setMonarchTokensProvider("tokenscript", tokenscriptLanguageDefinition);

      // Register completion provider
      if (!completionProviderRef.current) {
        completionProviderRef.current = new TokenScriptCompletionProvider();
        
        monaco.languages.registerCompletionItemProvider("tokenscript", {
          provideCompletionItems: (model, position) => {
            return completionProviderRef.current!.provideCompletionItems(model, position);
          },
          triggerCharacters: ['.', ' '], // Trigger completions on dot and space
        });
      }

      // Optional: Define a theme for TokenScript
      monaco.editor.defineTheme("tokenscript-theme", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "0066cc", fontStyle: "bold" },
          { token: "string", foreground: "008000" },
          { token: "number", foreground: "cc6600" },
          { token: "number.hex", foreground: "cc6600" },
          { token: "number.unit", foreground: "cc6600" },
          { token: "comment", foreground: "808080", fontStyle: "italic" },
          { token: "operator", foreground: "000000" },
          { token: "identifier", foreground: "000000" },
        ],
        colors: {
          "editor.background": "#ffffff",
          "editor.foreground": "#000000",
          "editor.lineHighlightBackground": "#f8f8f8",
          "editor.selectionBackground": "#add6ff",
        },
      });
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

    // Set focus to editor
    editor.focus();

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineNumbers: "on",
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
    });
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="border-b bg-gray-50 px-4 py-2 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center h-full">
          <span className="text-sm text-gray-600 font-mono">tokenscript</span>
          <div className="ml-2 min-w-0">
            {error && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                Error on line {error.line}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-b-lg overflow-hidden">
        <Editor
          height="100%"
          language="tokenscript"
          theme="tokenscript-theme"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            lineNumbers: "on",
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
            bracketPairColorization: { enabled: true },
            matchBrackets: "always",
            renderWhitespace: "selection",
          }}
        />
      </div>
    </div>
  );
}

export default MonacoEditor;