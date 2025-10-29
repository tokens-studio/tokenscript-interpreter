import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import { tokenscriptLanguage } from "@tokens-studio/tokenscript-interpreter/syntax-highlighting";
import "prismjs/themes/prism-tomorrow.css";
import "./PrismHighlighter.css";

interface PrismHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
}

function PrismHighlighter({ value, onChange, theme }: PrismHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const [highlightedCode, setHighlightedCode] = useState("");

  useEffect(() => {
    tokenscriptLanguage(Prism);
  }, []);

  useEffect(() => {
    if (codeRef.current) {
      const highlighted = Prism.highlight(
        value,
        Prism.languages.tokenscript,
        "tokenscript",
      );
      setHighlightedCode(highlighted);
    }
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
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
    <div className={`prism-editor prism-editor--${theme}`}>
      <pre
        ref={preRef}
        className="prism-highlight"
        aria-hidden="true"
      >
        <code
          ref={codeRef}
          className="language-tokenscript"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
      <textarea
        ref={textareaRef}
        className="prism-textarea"
        value={value}
        onChange={handleInput}
        onScroll={handleScroll}
        onKeyDown={handleTab}
        spellCheck={false}
      />
    </div>
  );
}

export default PrismHighlighter;
