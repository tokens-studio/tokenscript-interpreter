import Prism from "prismjs";
import { useEffect, useState } from "react";

interface JsonOutputProps {
  json: string;
}

function JsonOutput({ json }: JsonOutputProps) {
  const [highlightedCode, setHighlightedCode] = useState("");

  useEffect(() => {
    try {
      // Try to format the JSON for better display
      let formattedJson = json;
      try {
        const parsed = JSON.parse(json);
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use the original string
        formattedJson = json;
      }

      const highlighted = Prism.highlight(formattedJson, Prism.languages.json, "json");
      setHighlightedCode(highlighted);
    } catch (err) {
      console.warn("JSON output syntax highlighting failed:", err);
      setHighlightedCode(json);
    }
  }, [json]);

  if (!json) {
    return null;
  }

  return (
    <pre className="json-editor-font overflow-auto scrollbar-thin text-gray-800">
      <code
        className="language-json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism.js output is sanitized and safe
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
}

export default JsonOutput;
