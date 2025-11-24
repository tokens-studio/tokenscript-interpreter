import { useState, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import JsonEditor from "./components/JsonEditor";
import TokenNode from "./components/TokenNode";
import { process } from "./utils/executor";

const DEFAULT_INPUT = JSON.stringify(
  {
    steps: "10",
    "increase-by": "1",
    spacing: {
      simple:
        "variable i: Number = 0; variable xs: Dictionary; while (i < {steps}) [ i = i + {increase-by}; xs.set(i.to_string(), i + 0px); ]; return xs;",
    },
    "spacing-ref": "{spacing.simple.1}",
  },
  null,
  2,
);

const nodeTypes: NodeTypes = {
  token: TokenNode,
  virtual: TokenNode,
  value: TokenNode,
};

function processJson(jsonInput: string): {
  nodes: Node[];
  edges: Edge[];
} {
  try {
    const tokensInput = JSON.parse(jsonInput);
    return process(tokensInput);
  } catch (error) {
    console.error("Failed to process tokens:", error);
    return { nodes: [], edges: [] };
  }
}

export default function App() {
  const [jsonInput, setJsonInput] = useState(DEFAULT_INPUT);
  const [debouncedJsonInput, setDebouncedJsonInput] = useState(DEFAULT_INPUT);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedJsonInput(jsonInput);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [jsonInput]);

  const { nodes, edges } = useMemo(
    () => processJson(debouncedJsonInput),
    [debouncedJsonInput],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "400px 1fr",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ overflow: "auto", height: "100%" }}>
        <JsonEditor
          value={jsonInput}
          onChange={setJsonInput}
        />
      </div>

      <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
        {nodes.length > 0 && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data;
                if (data.isError) return "#dc2626";
                if (data.isVirtual) return "#0ea5e9";
                return "#94a3b8";
              }}
            />
          </ReactFlow>
        ) }
      </div>
    </div>
  );
}
