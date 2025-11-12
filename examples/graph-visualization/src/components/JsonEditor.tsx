import { useState, useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JsonEditor({
  value,
  onChange,
}: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [highlightedCode, setHighlightedCode] = useState("");

  useEffect(() => {
    try {
      const highlighted = Prism.highlight(
        value,
        Prism.languages.json,
        "json",
      );
      setHighlightedCode(highlighted);
    } catch {
      setHighlightedCode(value);
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Validate JSON
    try {
      JSON.parse(newValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
          Token Input (JSON)
        </h2>

      </div>

      {error && (
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#7f1d1d",
            color: "#fca5a5",
            fontSize: "12px",
            borderBottom: "1px solid #333",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <pre
          ref={preRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: "16px",
            backgroundColor: "transparent",
            color: "#d4d4d4",
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
            fontSize: "13px",
            lineHeight: "1.6",
            overflow: "hidden",
            pointerEvents: "none",
            whiteSpace: "pre",
            wordWrap: "normal",
            tabSize: 2,
            MozTabSize: 2,
            border: "none",
            boxSizing: "border-box",
          }}
          aria-hidden="true"
        >
          <code
            className="language-json"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
            style={{
              display: "block",
              margin: 0,
              padding: 0,
              border: "none",
              whiteSpace: "inherit",
              wordWrap: "inherit",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              boxSizing: "border-box",
            }}
          />
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleTab}
          spellCheck={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: "16px",
            backgroundColor: "transparent",
            color: "transparent",
            caretColor: "#d4d4d4",
            border: "none",
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
            fontSize: "13px",
            lineHeight: "1.6",
            resize: "none",
            outline: "none",
            overflow: "auto",
            whiteSpace: "pre",
            wordWrap: "normal",
            tabSize: 2,
            MozTabSize: 2,
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
