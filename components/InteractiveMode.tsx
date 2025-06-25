
import React, { useState, useCallback } from 'react';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { Interpreter } from '../interpreter/interpreter';
import { ReferenceRecord, ISymbolType, TokenType as LangTokenType } from '../types'; // Renamed TokenType to avoid conflict
import { InterpreterError, LexerError, ParserError } from '../interpreter/errors';
import { BaseSymbolType } from '../interpreter/symbols';

function isISymbolType(obj: any): obj is ISymbolType {
  return obj !== null && typeof obj === 'object' && 
         'type' in obj && // 'type' is a string property like "Number", "String"
         'value' in obj && // 'value' holds the actual data
         typeof obj.toString === 'function' &&
         typeof obj.equals === 'function'; // Assuming 'equals' is part of ISymbolType
}


export const InteractiveMode: React.FC = () => {
  const [code, setCode] = useState<string>('variable x: Number = 10 + 5;\nvariable y: String = "Hello";\nreturn x.to_string().concat(" ").concat(y);');
  const [referencesInput, setReferencesInput] = useState<string>('{\n  "size": 10,\n  "color": "#FF0000"\n}');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [ast, setAst] = useState<any | null>(null);

  const handleInterpret = useCallback(() => {
    setOutput(null);
    setError(null);
    setTokens([]);
    setAst(null);

    let parsedReferences: ReferenceRecord = {};
    try {
      if (referencesInput.trim() !== "") {
        parsedReferences = JSON.parse(referencesInput);
      }
    } catch (e: any) {
      setError(`Error parsing references JSON: ${e.message}`);
      return;
    }

    try {
      const lexer = new Lexer(code);
      const collectedTokens = [];
      let currentToken = lexer.getNextToken();
      while(currentToken.type !== LangTokenType.EOF) { // Use aliased TokenType
        collectedTokens.push(currentToken);
        currentToken = lexer.getNextToken();
      }
      setTokens(collectedTokens);

      // Reset lexer for parser
      const parserLexer = new Lexer(code);
      const parser = new Parser(parserLexer);
      const parsedAst = parser.parse(); // Defaults to full script mode
      setAst(parsedAst); 

      if (parsedAst) {
        const interpreter = new Interpreter(parsedAst, parsedReferences);
        const result = interpreter.interpret(); // Returns ISymbolType | string | null
        
        if (result === null) {
            setOutput("null");
        } else if (isISymbolType(result)) {
            setOutput(result.toString());
        } else { // Should be string if not ISymbolType or null
             setOutput(String(result));
        }

      } else {
        setOutput("No AST generated (empty input or parse error).");
      }

    } catch (e: any) {
      let errorMessage = e.message || "An unknown error occurred.";
      if (e instanceof LexerError || e instanceof ParserError || e instanceof InterpreterError) {
        errorMessage = e.message; // Already formatted by custom error classes
      }
      setError(errorMessage);
      console.error(e); // Log the full error object for more details
    }
  }, [code, referencesInput]);

  return (
    <div className="w-full max-w-4xl p-6 bg-gray-800 shadow-2xl rounded-lg border border-sky-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="code-input" className="block text-sm font-medium text-sky-300 mb-1">
            TokenScript Code
          </label>
          <textarea
            id="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter TokenScript code here..."
            className="w-full h-64 p-3 font-mono text-sm bg-gray-900 text-gray-100 border border-gray-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            aria-label="TokenScript Code Input"
          />
        </div>
        <div>
          <label htmlFor="references-input" className="block text-sm font-medium text-sky-300 mb-1">
            References (JSON)
          </label>
          <textarea
            id="references-input"
            value={referencesInput}
            onChange={(e) => setReferencesInput(e.target.value)}
            placeholder='Example: {"size": 10, "unit": "px"}'
            className="w-full h-64 p-3 font-mono text-sm bg-gray-900 text-gray-100 border border-gray-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            aria-label="References JSON Input"
          />
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={handleInterpret}
          className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          aria-label="Interpret Code"
        >
          Interpret
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-800 border border-red-600 text-red-100 rounded-md" role="alert">
          <h3 className="font-bold text-lg mb-1">Error:</h3>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}
      {output !== null && (
        <div className="mt-6 p-4 bg-green-800 border border-green-600 text-green-100 rounded-md" role-status>
          <h3 className="font-bold text-lg mb-1">Output:</h3>
          <pre className="whitespace-pre-wrap text-sm">{output}</pre>
        </div>
      )}
      
      {tokens.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-lg mb-2 text-sky-300">Tokens:</h3>
          <div className="max-h-60 overflow-y-auto p-3 bg-gray-900 border border-gray-700 rounded-md text-xs" aria-live="polite">
            {tokens.map((token, index) => (
              <div key={index} className="font-mono p-1 border-b border-gray-800 last:border-b-0">
                <span className="text-purple-400">{token.type}</span>: <span className="text-yellow-300">{JSON.stringify(token.value)}</span> (L:{token.line})
              </div>
            ))}
          </div>
        </div>
      )}

      {ast && (
         <div className="mt-6">
            <h3 className="font-bold text-lg mb-2 text-sky-300">AST (Simplified):</h3>
            <div className="max-h-60 overflow-y-auto p-3 bg-gray-900 border border-gray-700 rounded-md text-xs" aria-live="polite">
                <pre className="whitespace-pre-wrap font-mono">
                    {JSON.stringify(ast, (key, value) => {
                        if (key === 'token' && value && value.type) return `Token(${value.type}, ${JSON.stringify(value.value)})`;
                        // Add other simplifications if AST becomes too verbose e.g. for complex symbol values
                        return value;
                    }, 2)}
                </pre>
            </div>
        </div>
      )}
    </div>
  );
};
