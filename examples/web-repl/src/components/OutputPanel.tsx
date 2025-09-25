import Prism from "prismjs";
import { useEffect } from "react";

import "prismjs/themes/prism.css";
import "prismjs/components/prism-json";
import {
  BaseSymbolType,
  type ColorManager,
  type ColorSymbol,
} from "@tokens-studio/tokenscript-interpreter";
import ShellPanel from "./ShellPanel";
import { tokenscriptThemeColors } from "./shared-theme";

export interface OutputResult {
  error?: string;
  errorInfo?: {
    message: string;
    line?: number;
    token?: any;
  };
  executionTime?: number;
  output: any;
  colorManager?: any;
  type: "tokenscript" | "json" | "error";
}

const toCssColor = (color: ColorSymbol, colorManager: ColorManager): string | undefined => {
  try {
    // @ts-expect-error - Unwraps result -> CssColor -> String
    return colorManager.convertToByType(color, "CssColor").value.value.value as string;
  } catch (_e) {
    console.error("Error converting to css color", _e, color, colorManager);
  }
};

const ColorOutput = ({
  color,
  colorManager,
}: {
  color: ColorSymbol;
  colorManager: ColorManager;
}) => {
  const cssColor = toCssColor(color, colorManager);

  return (
    <div
      className="space-y-4"
      data-testid="color-output"
    >
      <div
        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
        data-testid="color-preview-section"
      >
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-inner"
          style={{ backgroundColor: cssColor }}
          title={`Color: ${cssColor}`}
          data-testid="color-swatch"
        />
        <div>
          <div
            className="font-semibold text-gray-900"
            data-testid="color-type-label"
          >
            Color Object
          </div>
          <div
            className="text-sm text-gray-600"
            data-testid="color-type-value"
          >
            Type: {color.getTypeName()}
          </div>
        </div>
      </div>

      {color.value && typeof color.value === "object" && Object.keys(color.value).length > 0 && (
        <div>
          <div className="font-semibold text-gray-900 mb-2">Properties:</div>
          <div className="bg-gray-50 rounded p-3 text-sm font-mono space-y-1">
            {Object.entries(color.value).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between"
              >
                <span className="text-blue-600">{key}:</span>
                <span className="text-gray-800">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function JsonOutput({ value }: { value: any }) {
  const jsonString = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  useEffect(() => {
    // Ensure theme colors are applied to CSS custom properties
    const root = document.documentElement;
    root.style.setProperty("--tokenscript-json-string", tokenscriptThemeColors.jsonString);
    root.style.setProperty("--tokenscript-json-number", tokenscriptThemeColors.jsonNumber);
    root.style.setProperty("--tokenscript-json-boolean", tokenscriptThemeColors.jsonBoolean);
    root.style.setProperty("--tokenscript-json-null", tokenscriptThemeColors.jsonNull);
    root.style.setProperty("--tokenscript-json-property", tokenscriptThemeColors.jsonProperty);
    root.style.setProperty(
      "--tokenscript-json-punctuation",
      tokenscriptThemeColors.jsonPunctuation,
    );

    Prism.highlightAll();
  }, []);

  return (
    <div
      className="bg-gray-50 rounded p-3 text-sm font-mono overflow-auto"
      data-testid="json-output"
    >
      <pre className="whitespace-pre-wrap">
        <code className="language-json">{jsonString}</code>
      </pre>
    </div>
  );
}

const StringOutput = ({ str }: { str: string }) => (
  <div className="text-gray-800">
    <pre className="whitespace-pre-wrap text-sm font-mono">{str}</pre>
  </div>
);

const ErrorOutput = ({ error }: { error: string }) => (
  <div
    className="text-red-600"
    data-testid="error-output"
  >
    <div className="font-semibold mb-2">Error:</div>
    <pre
      className="whitespace-pre-wrap text-sm"
      data-testid="error-message"
    >
      {error}
    </pre>
  </div>
);

const EmptyOutput = () => (
  <div
    className="text-gray-500 italic"
    data-testid="empty-output"
  >
    Run some code to see the output here...
  </div>
);

interface UnifiedOutputPanelProps {
  result: OutputResult;
  className?: string;
}

const Output = ({ result }: { result: OutputResult }) => {
  const { output, error, colorManager, type } = result;
  if (error) {
    return <ErrorOutput error={error} />;
  }

  if (!output) {
    return <EmptyOutput />;
  }

  if (type === "tokenscript" && output instanceof BaseSymbolType) {
    switch (output.type) {
      case "Color":
        return (
          <ColorOutput
            color={output as ColorSymbol}
            colorManager={colorManager}
          />
        );
      default:
        return <StringOutput str={output.toString()} />;
    }
  }

  if (type === "json") {
    return <JsonOutput value={output} />;
  }

  return null;
};

const OutputPanelTitle = ({ error, output }: { error?: string; output?: BaseSymbolType }) => (
  <div
    className="flex items-center space-x-2"
    data-testid="output-panel-title"
  >
    <div className={`w-3 h-3 bg-blue-500 rounded-full ${error ? "bg-red-500" : "bg-blue-500"}`} />
    <span className="font-bold">Output</span>
    {output?.type && <span>{output.getTypeName()}</span>}
  </div>
);

function OutputPanel({ result, className = "" }: UnifiedOutputPanelProps) {
  const { executionTime, error, output } = result;

  const headerRight = executionTime && (
    <div
      className="text-sm text-gray-500"
      data-testid="execution-time"
    >
      {executionTime}ms
    </div>
  );

  return (
    <ShellPanel
      title={
        <OutputPanelTitle
          error={error}
          output={output instanceof BaseSymbolType && output}
        />
      }
      headerRight={headerRight}
      className={className}
      data-testid="output-panel"
    >
      <div
        className="p-3 sm:p-4 overflow-auto"
        data-testid="output-panel-content"
      >
        <Output result={result} />
      </div>
    </ShellPanel>
  );
}

export default OutputPanel;
