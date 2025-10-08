import Prism from "prismjs";
import { useEffect } from "react";

import "prismjs/themes/prism.css";
import "prismjs/components/prism-json";
import { isNonEmptyObject, when } from "@interpreter/utils/type";
import {
  BaseSymbolType,
  type ColorManager,
  type ColorSymbol,
  type DictionarySymbol,
  type ListSymbol,
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
  const cssColor = toCssColor(color, colorManager);

  if (compact) {
    return (
      <div
        className="flex items-center space-x-3 rounded-lg"
        data-testid="color-output-compact"
      >
        <div
          className="w-20 h-10 flex-shrink-0 shadow-lg"
          style={{ backgroundColor: cssColor }}
          title={`Color: ${cssColor}`}
          data-testid="color-swatch-compact"
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-zinc-200 truncate"
            style={{ fontSize: "0.8em" }}
            data-testid="color-type-compact"
          >
            {colorManager.formatColorMethod(color)}
          </div>
          <div
            className="text-zinc-500 font-mono truncate"
            style={{ fontSize: "0.65em" }}
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
        className="flex items-center space-x-4 p-5 bg-zinc-800/30 rounded-xl border border-zinc-700/50"
        data-testid="color-preview-section"
      >
        <div
          className="w-20 h-20 rounded-xl border-2 border-zinc-700 shadow-2xl ring-4 ring-zinc-800/30"
          style={{ backgroundColor: cssColor }}
          title={`Color: ${cssColor}`}
          data-testid="color-swatch"
        />
        <div>
          <div
            className="font-semibold text-zinc-100 text-lg"
            data-testid="color-type-label"
          >
            Color Object
          </div>
          <div
            className="text-sm text-zinc-400 mt-1"
            data-testid="color-type-value"
          >
            Type: {color.getTypeName()}
          </div>
        </div>
      </div>

      {(isNonEmptyObject(color.value) || color.isHex()) && (
        <div>
          <div className="font-semibold text-sm text-zinc-300 mb-2">Properties</div>
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-4 text-sm font-mono space-y-2">
            {color.isHex() ? (
              <div className="flex justify-between">
                <span className="text-zinc-300">{color.toString()}</span>
              </div>
            ) : (
              Object.entries(color.value).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center"
                >
                  <span className="text-zinc-400">{key}:</span>
                  <span className="text-zinc-300">{String(value)}</span>
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
      className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 text-sm font-mono overflow-auto"
      data-testid="json-output"
    >
      <pre className="whitespace-pre-wrap">
        <code className="language-json">{jsonString}</code>
      </pre>
    </div>
  );
}

const StringOutput = ({ str, compact = false }: { str: string; compact?: boolean }) => {
  if (compact) {
    return (
      <div
        className="flex items-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
        data-testid="string-output-compact"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-400 font-mono truncate">{str}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-zinc-300">
      <pre className="whitespace-pre-wrap text-sm font-mono">{str}</pre>
    </div>
  );
};

const ErrorOutput = ({ error }: { error: string }) => (
  <div
    className="text-red-400"
    data-testid="error-output"
  >
    <div className="font-semibold mb-3 text-red-300">Error:</div>
    <pre
      className="whitespace-pre-wrap text-sm bg-red-950/30 border border-red-900/50 rounded-lg p-4"
      data-testid="error-message"
    >
      {error}
    </pre>
  </div>
);

const EmptyOutput = () => (
  <div
    className="text-zinc-500 italic text-center py-8"
    data-testid="empty-output"
  >
    Run some code to see the output here...
  </div>
);

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
  if (list.elements.length === 0) {
    if (compact) {
      return (
        <div
          className="flex items-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
          data-testid="empty-list-compact"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-300">List</div>
            <div className="text-xs text-zinc-500">Empty list</div>
          </div>
        </div>
      );
    }
    return (
      <div
        className="text-zinc-500 italic text-center py-4"
        data-testid="empty-list"
      >
        Empty list
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
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
        className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
        data-testid="dictionary-output-compact"
      >
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-sm font-medium text-zinc-300">Dictionary</div>
          <span className="text-xs text-zinc-500">({dictionary.value.size} keys)</span>
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
        <div className="font-semibold text-zinc-300">Dictionary</div>
        <span className="text-sm text-zinc-500">({dictionary.value.size} keys)</span>
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

const OutputPanelTitle = ({ error, output }: { error?: string; output?: BaseSymbolType }) => (
  <div
    className="flex items-center space-x-2"
    data-testid="output-panel-title"
  >
    <div
      className={`w-2 h-2 rounded-full ${error ? "bg-red-400" : "bg-emerald-400"} shadow-lg ${error ? "shadow-red-500/50" : "shadow-emerald-500/50"}`}
    />
    <span className="font-semibold text-zinc-200">Output</span>
    {output?.type && <span className="text-zinc-500 text-xs">{output.getTypeName()}</span>}
  </div>
);

function OutputPanel({ result, className = "" }: UnifiedOutputPanelProps) {
  const { executionTime, error, output } = result;

  return (
    <ShellPanel
      title={
        <OutputPanelTitle
          error={error}
          output={output instanceof BaseSymbolType ? output : undefined}
        />
      }
      headerRight={when(
        executionTime,
        <div
          className="text-xs text-zinc-500 font-mono px-2 py-1 bg-zinc-800/40 rounded-md border border-zinc-700/30"
          data-testid="execution-time"
        >
          {executionTime}ms
        </div>,
      )}
      className={`lg:h-full ${className}`}
      data-testid="output-panel"
    >
      <div
        className="p-4 sm:p-5"
        data-testid="output-panel-content"
      >
        <Output result={result} />
      </div>
    </ShellPanel>
  );
}

export default OutputPanel;
