import {
  ColorManager,
  Config,
  Interpreter,
  Lexer,
  Parser,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useState } from "react";
import hslSpec from "../../../data/specifications/colors/hsl.json";
import lrgbSpec from "../../../data/specifications/colors/lrgb.json";

import rgbSpec from "../../../data/specifications/colors/rgb.json";
import rgbaSpec from "../../../data/specifications/colors/rgba.json";
import srgbSpec from "../../../data/specifications/colors/srgb.json";
import OutputPanel from "./components/OutputPanel";
import SyntaxHighlightedEditor from "./components/SyntaxHighlightedEditor";

const DEFAULT_CODE = `// Example TokenScript code - try editing!
variable primary: Color.Hsl = hsl(220, 100, 50);

// Try different operations:
// variable lighter: Color.Hsl = primary.lighten(0.3);
// variable rgb_color: Color.Rgb = rgb(255, 0, 128);

return primary;`;

export interface ExecutionResult {
  output?: string;
  error?: string;
  executionTime?: number;
  rawResult?: any;
  colorManager?: any;
}

function setupColorManager(): ColorManager {
  const colorManager = new ColorManager();

  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/",
    rgbSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/",
    hslSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/",
    srgbSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/0/",
    rgbaSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/lrgb-color/0/",
    lrgbSpec as any,
  );

  return colorManager;
}

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<ExecutionResult>({});
  const [autoRun, setAutoRun] = useState(true);

  const executeCode = useCallback(async () => {
    // If code is empty or just whitespace, clear the output
    if (!code.trim()) {
      setResult({});
      return;
    }

    const startTime = performance.now();

    try {
      const colorManager = setupColorManager();
      const config = new Config({ colorManager });

      const lexer = new Lexer(code);
      const ast = new Parser(lexer).parse();
      const interpreter = new Interpreter(ast, { config });

      const output = interpreter.interpret();
      const executionTime = performance.now() - startTime;

      console.log("Output", { ast, interpreter, output, executionTime });

      let outputString: string;
      if (output && typeof output.toString === "function") {
        outputString = output.toString();
      } else if (typeof output === "string") {
        outputString = output;
      } else {
        outputString = JSON.stringify(output, null, 2);
      }

      setResult({
        output: outputString,
        executionTime: Math.round(executionTime * 100) / 100,
        rawResult: output,
        colorManager,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      setResult({
        error: error instanceof Error ? error.message : String(error),
        executionTime: Math.round(executionTime * 100) / 100,
      });
    }
  }, [code]);

  useEffect(() => {
    if (!autoRun) return;
    executeCode();
  }, [autoRun, executeCode]);

  useEffect(() => {
    executeCode();
  }, [executeCode]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      executeCode();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TokenScript Web REPL</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive environment for TokenScript code
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRun}
                  onChange={(e) => setAutoRun(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="auto-run"
                  className="text-sm text-gray-700"
                >
                  Auto-run
                </label>
              </div>
              <button
                type="button"
                onClick={executeCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Run Code
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Editor</h2>
            <SyntaxHighlightedEditor
              value={code}
              onChange={setCode}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
          </div>

          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Output</h2>
            <OutputPanel
              result={result}
              className="flex-1"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
