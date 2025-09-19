import type { ExecutionResult } from "../App";
import JsonOutput from "./JsonOutput";

function isColorSymbol(obj: any): boolean {
  return (
    obj && typeof obj === "object" && obj.type === "Color" && typeof obj.toString === "function"
  );
}

function getColorProperties(colorObj: any): { [key: string]: any } {
  const props: { [key: string]: any } = {};

  // Try to get common color properties
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

// Helper function to try different color conversions using ColorManager
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
    // If all fails, just use toString
    conversions.Value = String(colorObj);
  }

  return conversions;
}

interface OutputPanelProps {
  result: ExecutionResult;
  className?: string;
  inputMode?: "tokenscript" | "json";
}

function OutputPanel({ result, className = "", inputMode = "tokenscript" }: OutputPanelProps) {
  const { output, error, executionTime } = result;

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-red-600">
          <div className="font-semibold mb-2">Error:</div>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      );
    }

    if (result.output) {
      // For JSON mode, always show syntax-highlighted JSON
      if (inputMode === "json") {
        return (
          <JsonOutput
            json={output}
            title="processed tokens"
          />
        );
      }

      // Check if this might be a color object by trying to parse the raw result
      // We need to check the actual result object, not just the string output
      const rawResult = (result as any).rawResult;

      if (rawResult && isColorSymbol(rawResult)) {
        const properties = getColorProperties(rawResult);
        const conversions = tryColorConversions(rawResult, result?.colorManager);
        const colorValue = rawResult.toString();

        // Generate CSS color based on the color type
        let cssColor = "#999"; // fallback

        const colorTypeName = rawResult.getTypeName ? rawResult.getTypeName() : rawResult.type;
        const colorType = colorTypeName?.toLowerCase() || "";

        if (colorType.includes("rgb") && rawResult.value) {
          const { r, g, b, a } = rawResult.value;
          if (r !== undefined && g !== undefined && b !== undefined) {
            if (a !== undefined) {
              cssColor = `rgba(${r}, ${g}, ${b}, ${a})`;
            } else {
              cssColor = `rgb(${r}, ${g}, ${b})`;
            }
          }
        } else if (colorType.includes("hsl") && rawResult.value) {
          const { h, s, l } = rawResult.value;
          if (h !== undefined && s !== undefined && l !== undefined) {
            cssColor = `hsl(${h}, ${s}%, ${l}%)`;
          }
        } else if (colorType.includes("hex") && rawResult.value) {
          if (typeof rawResult.value === "string" && rawResult.value.startsWith("#")) {
            cssColor = rawResult.value;
          }
        }

        return (
          <div className="space-y-4">
            {/* Color Preview */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-inner"
                style={{ backgroundColor: cssColor }}
                title={`Color: ${colorValue}`}
              />
              <div>
                <div className="font-semibold text-gray-900">Color Object</div>
                <div className="text-sm text-gray-600">
                  Type: {rawResult.getTypeName ? rawResult.getTypeName() : rawResult.type}
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

      // Try to render as JSON if it looks like JSON, otherwise as regular text
      try {
        const _parsed = JSON.parse(output);
        return (
          <JsonOutput
            json={output}
            title="result"
          />
        );
      } catch {
        // Regular text output
        return (
          <div className="text-gray-800">
            <pre className="whitespace-pre-wrap text-sm font-mono">{output}</pre>
          </div>
        );
      }
    }

    return <div className="text-gray-500 italic">Run some code to see the output here...</div>;
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="border-b bg-gray-50 px-4 py-2 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600 font-mono">output</span>
        </div>
        {executionTime !== undefined && (
          <div className="text-sm text-gray-500">{executionTime}ms</div>
        )}
      </div>
      <div className="p-4 h-full overflow-auto scrollbar-thin">
        <div style={{ minHeight: "400px" }}>{renderContent()}</div>
      </div>
    </div>
  );
}

export default OutputPanel;
