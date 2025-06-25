
import React, { useState, useCallback, useEffect } from 'react';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { Interpreter } from '../interpreter/interpreter';
import { ReferenceRecord, ISymbolType, TokenType as LangTokenType } from '../types'; // Renamed TokenType to avoid conflict
import { InterpreterError, LexerError, ParserError } from '../interpreter/errors';
import { BaseSymbolType } from '../interpreter/symbols';
import styles from './InteractiveMode.module.css';

function isISymbolType(obj: any): obj is ISymbolType {
  return obj !== null && typeof obj === 'object' && 
         'type' in obj && // 'type' is a string property like "Number", "String"
         'value' in obj && // 'value' holds the actual data
         typeof obj.toString === 'function' &&
         typeof obj.equals === 'function'; // Assuming 'equals' is part of ISymbolType
}


interface InteractiveModeProps {
  initialCode?: string;
  initialReferences?: string;
}

export const InteractiveMode: React.FC<InteractiveModeProps> = ({
  initialCode,
  initialReferences
}) => {
  const [code, setCode] = useState<string>('variable x: Number = 10 + 5;\nvariable y: String = "Hello";\nreturn x.to_string().concat(" ").concat(y);');
  const [referencesInput, setReferencesInput] = useState<string>('{\n  "size": 10,\n  "color": "#FF0000"\n}');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [ast, setAst] = useState<any | null>(null);

  // Update state when props change
  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (initialReferences !== undefined) {
      setReferencesInput(initialReferences);
    }
  }, [initialReferences]);

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

  // Auto-run interpreter when example is loaded
  useEffect(() => {
    if (initialCode !== undefined && initialReferences !== undefined) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        handleInterpret();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialCode, initialReferences, handleInterpret]);

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <div className={styles.inputGroup}>
          <label htmlFor="code-input" className={styles.label}>
            TokenScript Code
          </label>
          <textarea
            id="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter TokenScript code here..."
            className={styles.textarea}
            aria-label="TokenScript Code Input"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="references-input" className={styles.label}>
            References (JSON)
          </label>
          <textarea
            id="references-input"
            value={referencesInput}
            onChange={(e) => setReferencesInput(e.target.value)}
            placeholder='Example: {"size": 10, "unit": "px"}'
            className={styles.textarea}
            aria-label="References JSON Input"
          />
        </div>
      </div>

      <div className={styles.buttonContainer}>
        <button
          onClick={handleInterpret}
          className={styles.interpretButton}
          aria-label="Interpret Code"
        >
          Interpret
        </button>
      </div>

      <div className={styles.outputSection}>
        {error && (
          <div className={styles.errorCard} role="alert">
            <h3 className={styles.cardTitle}>Error:</h3>
            <pre className={styles.cardContent}>{error}</pre>
          </div>
        )}

        {output !== null && (
          <div className={styles.successCard} role="status">
            <h3 className={styles.cardTitle}>Output:</h3>
            <pre className={styles.cardContent}>{output}</pre>
          </div>
        )}

        <div className={styles.debugSection}>
          {tokens.length > 0 && (
            <div className={styles.debugCard}>
              <h3 className={styles.debugTitle}>Tokens:</h3>
              <div className={styles.debugContent}>
                {tokens.map((token, index) => (
                  <div key={index} className={styles.tokenItem}>
                    <span className={styles.tokenType}>{token.type}</span>: <span className={styles.tokenValue}>{JSON.stringify(token.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ast && (
            <div className={styles.debugCard}>
              <h3 className={styles.debugTitle}>AST:</h3>
              <div className={styles.debugContent}>
                <pre className={styles.astContent}>
                  {JSON.stringify(ast, (key, value) => {
                    if (key === 'token' && value && value.type) return `Token(${value.type})`;
                    return value;
                  }, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
