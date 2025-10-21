import Prism from "prismjs";
import { useEffect } from "react";

import "prismjs/themes/prism.css";
import "prismjs/components/prism-json";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { isNonEmptyObject, when } from "@interpreter/utils/type";
import {
  BaseSymbolType,
  type ColorManager,
  type ColorSymbol,
  type DictionarySymbol,
  type ListSymbol,
} from "@tokens-studio/tokenscript-interpreter";
import ShellPanel from "./ShellPanel";
import { tokenscriptThemeColors, tokenscriptLightThemeColors } from "./shared-theme";

export interface OutputResult {
  error?: string;
  errorInfo?: {
    message: string;
    line?: number;
    token?: any;
  };
  executionTime?: number;
  output: any;
  colorManager: ColorManager;
  type: "tokenscript" | "json" | "error";
}

const toCssColor = (color: ColorSymbol, colorManager: ColorManager): string | undefined => {
  if (color.isHex()) return color.value;
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
  compact = false,
}: {
  color: ColorSymbol;
  colorManager: ColorManager;
  compact?: boolean;
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const cssColor = toCssColor(color, colorManager);

  if (compact) {
    return (
      <div
        className="flex items-center space-x-3 rounded-lg"
        data-testid="color-output-compact"
      >
        <div
          className="w-20 h-10 flex-shrink-0"
          style={{ backgroundColor: cssColor }}
          title={`Color: ${cssColor}`}
          data-testid="color-swatch-compact"
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium truncate"
            style={{ fontSize: "0.8em", color: currentTheme.textPrimary }}
            data-testid="color-type-compact"
          >
            {colorManager.formatColorMethod(color)}
          </div>
          <div
            className="font-mono truncate"
            style={{ fontSize: "0.65em", color: currentTheme.textMuted }}
            data-testid="color-value-compact"
          >
            {color.getTypeName()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid="color-output"
    >
      <div
        className="flex items-center space-x-4 p-5 rounded-lg border"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
        data-testid="color-preview-section"
      >
        <div
          className="w-20 h-20 rounded-lg border-2"
          style={{ backgroundColor: cssColor, borderColor: currentTheme.border }}
          title={`Color: ${cssColor}`}
          data-testid="color-swatch"
        />
        <div>
          <div
            className="font-semibold text-lg"
            style={{ color: currentTheme.textPrimary }}
            data-testid="color-type-label"
          >
            Color Object
          </div>
          <div
            className="text-sm mt-1"
            style={{ color: currentTheme.textSecondary }}
            data-testid="color-type-value"
          >
            Type: {color.getTypeName()}
          </div>
        </div>
      </div>

      {(isNonEmptyObject(color.value) || color.isHex()) && (
        <div>
          <div
            className="font-semibold text-sm mb-2"
            style={{ color: currentTheme.textSecondary }}
          >
            Properties
          </div>
          <div
            className="border rounded-lg p-4 text-sm font-mono space-y-2"
            style={{
              backgroundColor: currentTheme.surface,
              borderColor: currentTheme.border,
            }}
          >
            {color.isHex() ? (
              <div className="flex justify-between">
                <span style={{ color: currentTheme.textPrimary }}>{color.toString()}</span>
              </div>
            ) : (
              Object.entries(color.value).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center"
                >
                  <span style={{ color: currentTheme.textSecondary }}>{key}:</span>
                  <span style={{ color: currentTheme.textPrimary }}>{String(value)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function JsonOutput({ value }: { value: any }) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const jsonString = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const themeColors = theme === "light" ? tokenscriptLightThemeColors : tokenscriptThemeColors;

  useEffect(() => {
    // Ensure theme colors are applied to CSS custom properties
    const root = document.documentElement;
    root.style.setProperty("--tokenscript-json-string", themeColors.jsonString);
    root.style.setProperty("--tokenscript-json-number", themeColors.jsonNumber);
    root.style.setProperty("--tokenscript-json-boolean", themeColors.jsonBoolean);
    root.style.setProperty("--tokenscript-json-null", themeColors.jsonNull);
    root.style.setProperty("--tokenscript-json-property", themeColors.jsonProperty);
    root.style.setProperty(
      "--tokenscript-json-punctuation",
      themeColors.jsonPunctuation,
    );

    Prism.highlightAll();
  }, [themeColors]);

  return (
    <div
      className="text-sm font-mono overflow-auto"
      style={{
        color: currentTheme.textPrimary,
      }}
      data-testid="json-output"
    >
      <pre className="whitespace-pre-wrap p-3">
        <code className="language-json">{jsonString}</code>
      </pre>
    </div>
  );
}

const StringOutput = ({ str, compact = false }: { str: string; compact?: boolean }) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  if (compact) {
    return (
      <div
        className="flex items-center p-3 rounded-lg border"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
        data-testid="string-output-compact"
      >
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-mono truncate"
            style={{ color: currentTheme.textSecondary }}
          >
            {str}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: currentTheme.textPrimary }}>
      <pre className="whitespace-pre-wrap text-sm font-mono">{str}</pre>
    </div>
  );
};

const ErrorOutput = ({ error }: { error: string }) => (
  <div
    className="text-red-400"
    data-testid="error-output"
  >
    <pre
      className="whitespace-pre-wrap text-sm bg-red-950/30 border border-red-900/50 rounded-lg p-4"
      data-testid="error-message"
    >
      {error}
    </pre>
  </div>
);

const EmptyOutput = () => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div
      className="italic text-center py-8"
      style={{ color: currentTheme.textMuted }}
      data-testid="empty-output"
    >
      Run some code to see the output here...
    </div>
  );
};

interface UnifiedOutputPanelProps {
  result: OutputResult;
  className?: string;
}

const ListOutput = ({
  list,
  colorManager,
  compact = false,
}: {
  list: ListSymbol;
  colorManager: ColorManager;
  compact?: boolean;
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  if (list.elements.length === 0) {
    if (compact) {
      return (
        <div
          className="flex items-center p-3 rounded-lg border"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
          }}
          data-testid="empty-list-compact"
        >
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium"
              style={{ color: currentTheme.textPrimary }}
            >
              List
            </div>
            <div
              className="text-xs"
              style={{ color: currentTheme.textMuted }}
            >
              Empty list
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        className="italic text-center py-4"
        style={{ color: currentTheme.textMuted }}
        data-testid="empty-list"
      >
        Empty list
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
        data-testid="list-output-compact"
      >
        <div className="space-y-1">
          {list.elements.map((element, index) => (
            <SymbolOutput
              key={index}
              symbol={element}
              colorManager={colorManager}
              compact={true}
              data-testid={`list-item-${index}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className=""
      data-testid="list-output"
    >
      {list.elements.map((element, index) => (
        <SymbolOutput
          key={index}
          symbol={element}
          colorManager={colorManager}
          compact={true}
          data-testid={`list-item-${index}`}
        />
      ))}
    </div>
  );
};

const DictionaryOutput = ({
  dictionary,
  colorManager,
  compact = false,
}: {
  dictionary: DictionarySymbol;
  colorManager: ColorManager;
  compact?: boolean;
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const dictObject = Object.fromEntries(
    [...dictionary.value].map(([key, value]) => [
      key,
      value.type.toLowerCase() === "color"
        ? colorManager.formatColorMethod(value)
        : value.toString(),
    ]),
  );

  if (compact) {
    return (
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
        data-testid="dictionary-output-compact"
      >
        <div className="flex items-center space-x-2 mb-2">
          <div
            className="text-sm font-medium"
            style={{ color: currentTheme.textPrimary }}
          >
            Dictionary
          </div>
          <span
            className="text-xs"
            style={{ color: currentTheme.textMuted }}
          >
            ({dictionary.value.size} keys)
          </span>
        </div>
        <JsonOutput value={dictObject} />
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      data-testid="dictionary-output"
    >
      <div className="flex items-center space-x-2 mb-3">
        <div
          className="font-semibold"
          style={{ color: currentTheme.textPrimary }}
        >
          Dictionary
        </div>
        <span
          className="text-sm"
          style={{ color: currentTheme.textMuted }}
        >
          ({dictionary.value.size} keys)
        </span>
      </div>

      <JsonOutput value={dictObject} />
    </div>
  );
};

const SymbolOutput = ({
  symbol,
  colorManager,
  compact = false,
}: {
  symbol: BaseSymbolType;
  colorManager: ColorManager;
  compact?: boolean;
}) => {
  switch (symbol.type.toLowerCase()) {
    case "color":
      return (
        <ColorOutput
          color={symbol as ColorSymbol}
          colorManager={colorManager}
          compact={compact}
        />
      );
    case "list":
      return (
        <ListOutput
          list={symbol as ListSymbol}
          colorManager={colorManager}
          compact={compact}
        />
      );
    case "dictionary":
      return (
        <DictionaryOutput
          dictionary={symbol as DictionarySymbol}
          colorManager={colorManager}
          compact={compact}
        />
      );
    default:
      return (
        <StringOutput
          str={symbol.toString()}
          compact={compact}
        />
      );
  }
};

const Output = ({ result }: { result: OutputResult }) => {
  const { output, error, colorManager, type } = result;
  if (error) {
    return <ErrorOutput error={error} />;
  }

  if (!output) {
    return <EmptyOutput />;
  }

  if (type === "tokenscript" && output instanceof BaseSymbolType) {
    return (
      <SymbolOutput
        symbol={output}
        colorManager={colorManager}
      />
    );
  }

  if (type === "json") {
    return <JsonOutput value={output} />;
  }

  return null;
};

const OutputPanelTitle = ({ error, output }: { error?: string; output?: BaseSymbolType }) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div
      className="flex items-center space-x-2"
      data-testid="output-panel-title"
    >
      <div
        className={`w-2 h-2 rounded-full ${error ? "bg-red-400" : "bg-emerald-400"}`}
      />
      <span
        className="font-semibold"
        style={{ color: error ? "#f87171" : currentTheme.textPrimary }}
      >
        {error ? "Error" : "Output"}
      </span>
      {output?.type && !error && (
        <span
          className="text-xs"
          style={{ color: currentTheme.textMuted }}
        >
          {output.getTypeName()}
        </span>
      )}
    </div>
  );
};

function OutputPanel({ result, className = "" }: UnifiedOutputPanelProps) {
  const { error, output } = result;
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{ backgroundColor: currentTheme.background }}
      data-testid="output-panel"
    >
      {/* Header */}
      <div
        className="flex items-center px-4 py-2 border-b"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
      >
        <OutputPanelTitle
          error={error}
          output={output instanceof BaseSymbolType ? output : undefined}
        />
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto"
        style={{ color: currentTheme.textPrimary }}
        data-testid="output-panel-content"
      >
        <Output result={result} />
      </div>
    </div>
  );
}

export default OutputPanel;
