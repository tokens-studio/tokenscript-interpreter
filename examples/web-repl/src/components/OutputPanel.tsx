import Prism from "prismjs";
import { useEffect } from "react";

import "prismjs/themes/prism.css";
import "prismjs/components/prism-json";
import { tokenscriptThemeColors } from "./shared-theme";

export interface OutputResult {
  output?: any; // Can be string, Color object, parsed JSON, etc.
  error?: string;
  errorInfo?: {
    message: string;
    line?: number;
    token?: any;
  };
  executionTime?: number;
  rawResult?: any;
  colorManager?: any;
  type: "tokenscript" | "json" | "error";
}

// Type guard functions
function isColorSymbol(obj: any): boolean {
  return (
    obj && typeof obj === "object" && obj.type === "Color" && typeof obj.toString === "function"
  );
}

function isJsonObject(obj: any): boolean {
  return obj && typeof obj === "object" && !isColorSymbol(obj);
}

// Helper functions for color objects
function getColorProperties(colorObj: any): { [key: string]: any } {
  const props: { [key: string]: any } = {};
  const commonProps = ["r", "g", "b", "a", "h", "s", "l", "value"];

  for (const prop of commonProps) {
    if (
      colorObj.value &&
      typeof colorObj.value === "object" &&
      colorObj.value[prop] !== undefined
    ) {
      props[prop] = colorObj.value[prop];
    }
  }

  return props;
}

function tryColorConversions(colorObj: any, colorManager?: any): { [key: string]: string } {
  const conversions: { [key: string]: string } = {};

  try {
    // Use ColorManager's formatColorMethod if available
    if (colorManager && typeof colorManager.formatColorMethod === "function") {
      try {
        const formatted = colorManager.formatColorMethod(colorObj);
        conversions["Current Format"] = formatted;
      } catch (_e) {
        if (typeof colorObj.toString === "function") {
          conversions["Current Format"] = colorObj.toString();
        }
      }
    } else if (typeof colorObj.toString === "function") {
      conversions["Current Format"] = colorObj.toString();
    }

    // Try hex conversion
    if (colorObj.to && typeof colorObj.to.hex === "function") {
      try {
        const hexResult = colorObj.to.hex();
        if (hexResult) {
          if (colorManager && typeof colorManager.formatColorMethod === "function") {
            conversions.Hex = colorManager.formatColorMethod(hexResult);
          } else if (typeof hexResult.toString === "function") {
            conversions.Hex = hexResult.toString();
          }
        }
      } catch (_e) {}
    }

    if (colorObj.to && typeof colorObj.to.rgb === "function") {
      try {
        const rgbResult = colorObj.to.rgb();
        if (rgbResult) {
          if (colorManager && typeof colorManager.formatColorMethod === "function") {
            conversions.RGB = colorManager.formatColorMethod(rgbResult);
          } else if (typeof rgbResult.toString === "function") {
            conversions.RGB = rgbResult.toString();
          }
        }
      } catch (_e) {}
    }

    if (colorObj.to && typeof colorObj.to.hsl === "function") {
      try {
        const hslResult = colorObj.to.hsl();
        if (hslResult) {
          if (colorManager && typeof colorManager.formatColorMethod === "function") {
            conversions.HSL = colorManager.formatColorMethod(hslResult);
          } else if (typeof hslResult.toString === "function") {
            conversions.HSL = hslResult.toString();
          }
        }
      } catch (_e) {}
    }
  } catch (_e) {
    conversions.Value = String(colorObj);
  }

  return conversions;
}

function getCssColorFromColorObject(colorObj: any): string {
  const colorTypeName = colorObj.getTypeName ? colorObj.getTypeName() : colorObj.type;
  const colorType = colorTypeName?.toLowerCase() || "";

  if (colorType.includes("rgb") && colorObj.value) {
    const { r, g, b, a } = colorObj.value;
    if (r !== undefined && g !== undefined && b !== undefined) {
      if (a !== undefined) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  } else if (colorType.includes("hsl") && colorObj.value) {
    const { h, s, l } = colorObj.value;
    if (h !== undefined && s !== undefined && l !== undefined) {
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  } else if (colorType.includes("hex") && colorObj.value) {
    if (typeof colorObj.value === "string" && colorObj.value.startsWith("#")) {
      return colorObj.value;
    }
  }

  return "#999"; // fallback
}

// Component rendering functions
function renderColorOutput(colorObj: any, colorManager?: any) {
  const properties = getColorProperties(colorObj);
  const conversions = tryColorConversions(colorObj, colorManager);
  const colorValue = colorObj.toString();
  const cssColor = getCssColorFromColorObject(colorObj);

  return (
    <div
      className="space-y-4"
      data-testid="color-output"
    >
      {/* Color Preview */}
      <div
        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
        data-testid="color-preview-section"
      >
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-inner"
          style={{ backgroundColor: cssColor }}
          title={`Color: ${colorValue}`}
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
            Type: {colorObj.getTypeName ? colorObj.getTypeName() : colorObj.type}
          </div>
        </div>
      </div>

      {/* Properties */}
      {Object.keys(properties).length > 0 && (
        <div>
          <div className="font-semibold text-gray-900 mb-2">Properties:</div>
          <div className="bg-gray-50 rounded p-3 text-sm font-mono space-y-1">
            {Object.entries(properties).map(([key, value]) => (
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

      {/* Format Conversions */}
      <div>
        <div className="font-semibold text-gray-900 mb-2">Formats:</div>
        <div className="bg-gray-50 rounded p-3 text-sm font-mono space-y-1">
          {Object.entries(conversions).map(([format, value]) => (
            <div
              key={format}
              className="flex justify-between"
            >
              <span className="text-purple-600">{format}:</span>
              <span className="text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

function renderStringOutput(str: string) {
  return (
    <div className="text-gray-800">
      <pre className="whitespace-pre-wrap text-sm font-mono">{str}</pre>
    </div>
  );
}

function renderErrorOutput(error: string) {
  return (
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
}

function renderEmptyOutput() {
  return (
    <div
      className="text-gray-500 italic"
      data-testid="empty-output"
    >
      Run some code to see the output here...
    </div>
  );
}

interface UnifiedOutputPanelProps {
  result: OutputResult;
  className?: string;
}

function OutputPanel({ result, className = "" }: UnifiedOutputPanelProps) {
  const { output, error, executionTime, rawResult, colorManager, type } = result;

  const renderContent = () => {
    // Handle errors first
    if (error) {
      return renderErrorOutput(error);
    }

    // Handle empty output
    if (!output && !rawResult) {
      return renderEmptyOutput();
    }

    // For TokenScript mode, check if we have a color object
    if (type === "tokenscript" && rawResult && isColorSymbol(rawResult)) {
      return renderColorOutput(rawResult, colorManager);
    }

    // For JSON mode or JSON-like objects
    if (type === "json" || isJsonObject(output) || isJsonObject(rawResult)) {
      const objectToRender = rawResult || output;
      return <JsonOutput value={objectToRender} />;
    }

    // For string output
    if (typeof output === "string") {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(output);
        return <JsonOutput value={parsed} />;
      } catch {
        // Regular string output
        return renderStringOutput(output);
      }
    }

    // Fallback for other types
    return renderStringOutput(String(output || rawResult));
  };

  const headerRight =
    executionTime !== undefined ? (
      <div
        className="text-sm text-gray-500"
        data-testid="execution-time"
      >
        {executionTime}ms
      </div>
    ) : undefined;

  const titleWithIcon = (
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <span>Output</span>
    </div>
  );

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border shadow-sm h-full ${className}`}
      data-testid="output-panel"
    >
      <div className="border-b bg-gray-50 px-3 sm:px-4 py-2 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center justify-between h-full w-full">
          <div
            className="text-xs sm:text-sm text-gray-600 font-mono truncate pr-2"
            data-testid="output-panel-title"
          >
            {titleWithIcon}
          </div>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0">{headerRight}</div>}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 rounded-b-lg overflow-auto"
        data-testid="output-panel-content"
      >
        <div className="p-3 sm:p-4 h-full overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}

export default OutputPanel;
