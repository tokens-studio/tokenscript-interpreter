import Prism from "prismjs";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import "prismjs/themes/prism.css";
import "./tokenscript-prism";

export interface ErrorInfo {
  message: string;
  line?: number;
  token?: any;
}

interface SyntaxHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  className?: string;
  error?: ErrorInfo;
}

function SyntaxHighlightedEditor({
  value,
  onChange,
  onKeyDown,
  className = "",
  error,
}: SyntaxHighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [highlightedCode, setHighlightedCode] = useState("");

  // Sync scroll between textarea and highlight layer
  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Highlight code whenever value changes
  useEffect(() => {
    try {
      const highlighted = Prism.highlight(value, Prism.languages.tokenscript, "tokenscript");

      // Add error highlighting if there's an error with a line number
      if (error?.line) {
        const lines = highlighted.split("\n");
        const errorLineIndex = error.line - 1; // Convert to 0-based index

        if (errorLineIndex >= 0 && errorLineIndex < lines.length) {
          lines[errorLineIndex] =
            `<span class="tokenscript-error-line">${lines[errorLineIndex]}</span>`;
        }

        setHighlightedCode(lines.join("\n"));
      } else {
        setHighlightedCode(highlighted);
      }

      // Sync scroll after highlighting update
      setTimeout(() => syncScroll(), 0);
    } catch (err) {
      // Fallback to plain text if highlighting fails
      console.warn("Syntax highlighting failed:", err);
      setHighlightedCode(value);
      setTimeout(() => syncScroll(), 0);
    }
  }, [value, error]);

  // Setup keyboard event listener
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onKeyDown) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      onKeyDown(event);
    };

    textarea.addEventListener("keydown", handleKeyDown);

    return () => {
      textarea.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyDown]);

  const handleScroll = () => {
    syncScroll();
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    // Sync scroll after content change
    setTimeout(() => syncScroll(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = `${value.substring(0, start)}  ${value.substring(end)}`;
      onChange(newValue);

      // Move cursor to after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="border-b bg-gray-50 px-4 py-2 rounded-t-lg flex-shrink-0">
        <div className="flex items-center">
          <span className="text-sm text-gray-600 font-mono">tokenscript</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {/* Syntax highlighting layer */}
        <pre
          ref={highlightRef}
          className="tokenscript-editor-font tokenscript-highlight-overlay"
        >
          <code
            className="language-tokenscript"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism.js output is sanitized and safe
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>

        {/* Input textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onInput={syncScroll}
          onSelect={syncScroll}
          onClick={syncScroll}
          className="tokenscript-editor-font tokenscript-input-area focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-b-lg scrollbar-thin"
          placeholder="Enter your TokenScript code here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default SyntaxHighlightedEditor;
