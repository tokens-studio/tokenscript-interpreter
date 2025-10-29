import { Editor } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type * as monacoEditor from "monaco-editor";
import {
  tokenscriptLanguageDefinition,
  tokenscriptLanguageConfig,
} from "@tokens-studio/tokenscript-interpreter/syntax-highlighting";

interface MonacoHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
}

function MonacoHighlighter({ value, onChange, theme }: MonacoHighlighterProps) {
  const monacoRef = useRef<typeof monacoEditor | null>(null);

  function handleEditorWillMount(monaco: typeof monacoEditor) {
    monacoRef.current = monaco;

    monaco.languages.register({ id: "tokenscript" });

    monaco.languages.setMonarchTokensProvider(
      "tokenscript",
      tokenscriptLanguageDefinition,
    );

    monaco.languages.setLanguageConfiguration(
      "tokenscript",
      tokenscriptLanguageConfig,
    );

    monaco.editor.defineTheme("tokenscript-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0" },
        { token: "type", foreground: "4EC9B0" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "number.hex", foreground: "D19A66" },
        { token: "number.unit", foreground: "D4A5FF" },
        { token: "function", foreground: "DCDCAA" },
        { token: "method", foreground: "DCDCAA" },
        { token: "property", foreground: "9CDCFE" },
        { token: "operator", foreground: "D4D4D4" },
        { token: "reference", foreground: "9CDCFE", fontStyle: "italic" },
        { token: "delimiter", foreground: "D4D4D4" },
        { token: "identifier", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
      },
    });

    monaco.editor.defineTheme("tokenscript-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "keyword", foreground: "AF00DB" },
        { token: "type", foreground: "267F99" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
        { token: "number.hex", foreground: "D97706" },
        { token: "number.unit", foreground: "9333EA" },
        { token: "function", foreground: "795E26" },
        { token: "method", foreground: "795E26" },
        { token: "property", foreground: "001080" },
        { token: "operator", foreground: "000000" },
        { token: "reference", foreground: "001080", fontStyle: "italic" },
        { token: "delimiter", foreground: "000000" },
        { token: "identifier", foreground: "000000" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#000000",
      },
    });
  }

  useEffect(() => {
    if (monacoRef.current) {
      const monacoTheme = theme === "dark" ? "tokenscript-dark" : "tokenscript-light";
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [theme]);

  return (
    <Editor
      height="100%"
      defaultLanguage="tokenscript"
      value={value}
      onChange={(value) => onChange(value || "")}
      beforeMount={handleEditorWillMount}
      theme={theme === "dark" ? "tokenscript-dark" : "tokenscript-light"}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "Consolas, Monaco, Courier New, monospace",
        lineNumbers: "off",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        wrappingStrategy: "advanced",
        padding: { top: 0, bottom: 0 },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        renderLineHighlight: "none",
        contextmenu: false,
        links: false,
      }}
    />
  );
}

export default MonacoHighlighter;
