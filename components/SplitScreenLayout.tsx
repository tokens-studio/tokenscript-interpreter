import type React from "react";
import { useState } from "react";
import { DocumentationPanel } from "./DocumentationPanel";
import { InteractiveMode } from "./InteractiveMode";
import styles from "./SplitScreenLayout.module.css";

export const SplitScreenLayout: React.FC = () => {
  const [currentExample, setCurrentExample] = useState<{
    code: string;
    references: string;
    title: string;
  } | null>(null);

  const handleLoadExample = (code: string, references: string, title: string) => {
    setCurrentExample({ code, references, title });
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Documentation */}
      <div className={styles.documentationPanel}>
        <DocumentationPanel onLoadExample={handleLoadExample} />
      </div>

      {/* Right Panel - Interactive Tool */}
      <div className={styles.interpreterPanel}>
        <div className={styles.interpreterHeader}>
          <h2 className={styles.interpreterTitle}>Interpreter</h2>
          <p className={styles.interpreterSubtitle}>Interactive execution environment</p>
          {currentExample && (
            <p className={styles.currentExample}>Current: {currentExample.title}</p>
          )}
        </div>
        <div className={styles.interpreterContent}>
          <InteractiveMode
            initialCode={currentExample?.code}
            initialReferences={currentExample?.references}
          />
        </div>
      </div>
    </div>
  );
};
