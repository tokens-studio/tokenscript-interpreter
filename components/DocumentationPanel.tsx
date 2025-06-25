import React from 'react';
import styles from './DocumentationPanel.module.css';

interface DocumentationPanelProps {
  onLoadExample: (code: string, references: string, title: string) => void;
}

export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ onLoadExample }) => {
  const examples = {
    basicCalculation: {
      title: "Basic Token Calculation",
      code: `// Calculate responsive spacing
{base.spacing} * 1.5px`,
      references: `{
  "base.spacing": 16
}`,
    },
    colorManipulation: {
      title: "Color Variables",
      code: `variable base_color: Color = #3B82F6;
variable darker_color: Color = #1E40AF;
return base_color;`,
      references: `{}`,
    },
    conditionalLogic: {
      title: "Conditional Design Logic",
      code: `variable size: String = {screen.size};
variable padding: NumberWithUnit = 16px;

if(size == "mobile") [
    padding = 12px;
] else [
    padding = 24px;
];

return padding;`,
      references: `{
  "screen.size": "mobile"
}`,
    },
    mathFunctions: {
      title: "Mathematical Functions",
      code: `variable base: Number = {typography.base};
variable scale: Number = {typography.scale};
variable result: Number = base * pow(scale, 2);
return result.to_string().concat("px");`,
      references: `{
  "typography.base": 16,
  "typography.scale": 1.25
}`,
    },
    listOperations: {
      title: "Working with Lists",
      code: `variable colors: List = #FF0000, #00FF00, #0000FF;
variable first_color: Color = colors.get(0);
variable list_length: Number = colors.length();
return first_color;`,
      references: `{}`,
    },
    stringManipulation: {
      title: "String Operations",
      code: `variable brand: String = {brand.name};
variable suffix: String = " Design System";
variable result: String = brand.concat(suffix);
return result.upper();`,
      references: `{
  "brand.name": "acme"
}`,
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          TokenScript
        </h1>
        <p className={styles.subtitle}>
          TokenScript is an enigmatic design token manipulation language, that harnesses the mystical
          power of mathematical expressions and conditional logic. Its methodology, defying conventional
          design systems, is steeped in the esoteric knowledge of computational design. This magical
          technology creates dynamic relationships between design tokens, producing visually striking
          and maintainable design systems.
        </p>
      </div>

      {/* Introduction */}
      <section className={styles.section}>
        <p className={styles.introText}>
          The tome of TokenScript documentation is a comprehensive guide to the arcane arts of design
          token computation. You will gain an understanding of how this tool creates dynamic and
          responsive design systems through the following sections.
        </p>

        <div className={styles.featureGrid}>
          <div>• Basic Calculations</div>
          <div>• Variables & Types</div>
          <div>• Color Manipulation</div>
          <div>• Conditional Logic</div>
          <div>• Mathematical Functions</div>
          <div>• String Operations</div>
          <div>• List Management</div>
          <div>• Token References</div>
        </div>
      </section>

      {/* Basic Calculations */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Calculations</h2>
        <p className={styles.sectionText}>
          The foundation of TokenScript lies in its ability to perform calculations with design tokens.
          You can reference external tokens using the <code className={styles.codeInline}>{`{token.name}`}</code> syntax
          and combine them with mathematical operations.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Responsive Spacing</h3>
          <p className={styles.exampleDescription}>
            Create consistent spacing scales by multiplying base values with ratios.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.basicCalculation.code,
              examples.basicCalculation.references,
              examples.basicCalculation.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* Variables & Types */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Variables & Types</h2>
        <p className={styles.sectionText}>
          TokenScript features a strong type system with support for Numbers, Strings, Colors, Lists,
          and NumberWithUnit types. Variables must be declared with explicit types for clarity and safety.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Color Variables</h3>
          <p className={styles.exampleDescription}>
            Define and manipulate color values with type safety.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.colorManipulation.code,
              examples.colorManipulation.references,
              examples.colorManipulation.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* Conditional Logic */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Conditional Logic</h2>
        <p className={styles.sectionText}>
          Create responsive design decisions using conditional statements. TokenScript supports
          if/else constructs that allow your design tokens to adapt based on context.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Responsive Design Logic</h3>
          <p className={styles.exampleDescription}>
            Adjust spacing and sizing based on screen size or other contextual variables.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.conditionalLogic.code,
              examples.conditionalLogic.references,
              examples.conditionalLogic.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* Mathematical Functions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mathematical Functions</h2>
        <p className={styles.sectionText}>
          TokenScript includes a rich set of mathematical functions including
          <code className={styles.codeInline}>min()</code>,
          <code className={styles.codeInline}>max()</code>,
          <code className={styles.codeInline}>pow()</code>,
          <code className={styles.codeInline}>sqrt()</code>, and more.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Typography Scaling</h3>
          <p className={styles.exampleDescription}>
            Use mathematical functions to create harmonious typography scales.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.mathFunctions.code,
              examples.mathFunctions.references,
              examples.mathFunctions.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* List Operations */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>List Operations</h2>
        <p className={styles.sectionText}>
          Work with collections of values using Lists. Access elements, check lengths,
          and manipulate arrays of colors, numbers, or other types.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Color Palettes</h3>
          <p className={styles.exampleDescription}>
            Manage collections of colors and extract specific values from palettes.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.listOperations.code,
              examples.listOperations.references,
              examples.listOperations.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* String Manipulation */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>String Manipulation</h2>
        <p className={styles.sectionText}>
          Transform and combine text values with string methods like
          <code className={styles.codeInline}>concat()</code>,
          <code className={styles.codeInline}>upper()</code>,
          <code className={styles.codeInline}>lower()</code>, and
          <code className={styles.codeInline}>split()</code>.
        </p>

        <div className={styles.exampleCard}>
          <h3 className={styles.exampleTitle}>Brand Name Processing</h3>
          <p className={styles.exampleDescription}>
            Combine and transform brand names and text tokens dynamically.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.stringManipulation.code,
              examples.stringManipulation.references,
              examples.stringManipulation.title
            )}
            className={styles.exampleButton}
          >
            Try Example →
          </button>
        </div>
      </section>

      {/* Footer */}
      <section className={styles.footerSection}>
        <h2 className={styles.sectionTitle}>Explore & Experiment</h2>
        <p className={styles.sectionText}>
          The true power of TokenScript is revealed through experimentation. Click any example
          to load it into the interpreter, then modify the code to see how changes affect the output.
          Create your own token relationships and discover new possibilities for your design system.
        </p>

        <div className={styles.footerCard}>
          <h3 className={styles.footerTitle}>Ready to Begin?</h3>
          <p className={styles.footerDescription}>
            Start with any example above, or write your own TokenScript expressions.
            The interpreter on the right will execute your code in real-time.
          </p>
          <button
            onClick={() => onLoadExample(
              examples.basicCalculation.code,
              examples.basicCalculation.references,
              "Getting Started"
            )}
            className={styles.footerButton}
          >
            Start with Basic Example →
          </button>
        </div>
      </section>
    </div>
  );
};
