import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import {
  tokenscriptLanguageConfig,
  tokenscriptLanguageDefinition,
} from "./monaco-tokenscript-lang";
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

const options = {
  fontSize: 14,
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
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
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

      monaco.editor.defineTheme("tokenscript-theme", {
        base: "vs",
        inherit: true,
        rules: [
          // Keywords (variable, if, else, etc.)
          { token: "keyword", foreground: "0000FF", fontStyle: "bold" },

          // Types (String, Number, Color, etc.)
          { token: "type", foreground: "267f99", fontStyle: "bold" },

          // Functions (rgb, hsl, lighten, etc.)
          { token: "function", foreground: "795da3", fontStyle: "bold" },

          // Variables and identifiers
          { token: "variable.name", foreground: "001080" },
          { token: "identifier", foreground: "001080" },

          // References (curly braces like {variable.name})
          { token: "reference", foreground: "E31837", fontStyle: "italic", fontWeight: "bold" },

          // Strings
          { token: "string", foreground: "a31515" },
          { token: "string.invalid", foreground: "cd3131" },

          // Numbers
          { token: "number", foreground: "098658" },
          { token: "number.float", foreground: "098658" },

          // Hex colors
          { token: "number.hex", foreground: "E07B39", fontStyle: "bold" },

          // Numbers with units (like 12px, 1.5em)
          { token: "number.unit", foreground: "098658", fontStyle: "bold" },

          // Comments
          { token: "comment", foreground: "999999", fontStyle: "italic" },

          // Operators (+, -, *, /, =, etc.)
          { token: "operator", foreground: "D73A49", fontStyle: "bold" },

          // Delimiters (parentheses, brackets, semicolons, etc.)
          { token: "delimiter", foreground: "24292e" },
        ],
        colors: {
          "editor.background": "#ffffff",
          "editor.foreground": "#000000",
          "editor.lineHighlightBackground": "#f8f8ff",
          "editor.selectionBackground": "#add6ff",
          "editorLineNumber.foreground": "#666666",
          "editorLineNumber.activeForeground": "#333333",
          "editorGutter.background": "#fafafa",
          "editorGutter.border": "#e8e8e8",
          "scrollbar.shadow": "#00000010",
          "scrollbarSlider.background": "#c0c0c040",
          "scrollbarSlider.hoverBackground": "#c0c0c060",
          "scrollbarSlider.activeBackground": "#c0c0c080",
        },
      });

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

  return (
    <div className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="border-b bg-gray-50 px-4 py-2 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center justify-between h-full">
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
          options={options}
        />
      </div>
    </div>
  );
}

export default MonacoEditor;
