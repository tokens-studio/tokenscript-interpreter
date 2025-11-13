import type { GraphNode } from "@tokens-studio/tokenscript-interpreter";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

interface TokenNodeProps {
  data: GraphNode;
}

const TokenNode = memo(({ data }: TokenNodeProps) => {
  const { label, valueType, preview, isVirtual, isError } = data;

  const getBackgroundColor = () => {
    if (isError) return "#fee";
    if (isVirtual) return "#e0f2fe";
    switch (valueType) {
      case "color":
        return "#fef3c7";
      case "number":
        return "#dbeafe";
      case "string":
        return "#e0e7ff";
      case "list":
        return "#ddd6fe";
      case "dictionary":
        return "#fce7f3";
      default:
        return "#f3f4f6";
    }
  };

  const getBorderColor = () => {
    if (isError) return "#dc2626";
    if (isVirtual) return "#0ea5e9";
    return "#d1d5db";
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "8px",
        backgroundColor: getBackgroundColor(),
        border: `2px solid ${getBorderColor()}`,
        minWidth: "200px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div style={{ marginBottom: "6px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "#6b7280",
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              padding: "2px 6px",
              backgroundColor: "rgba(255,255,255,0.7)",
              borderRadius: "4px",
            }}
          >
            {valueType}
          </span>
          {isVirtual && (
            <span
              style={{
                padding: "2px 6px",
                backgroundColor: "#0ea5e9",
                color: "white",
                borderRadius: "4px",
              }}
            >
              virtual
            </span>
          )}
        </div>
      </div>

      {preview && (
        <div
          style={{
            fontSize: "11px",
            color: isError ? "#dc2626" : "#4b5563",
            marginTop: "8px",
            padding: "6px 8px",
            backgroundColor: "rgba(255,255,255,0.5)",
            borderRadius: "4px",
            fontFamily: "monospace",
            wordBreak: "break-word",
          }}
        >
          {preview}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

TokenNode.displayName = "TokenNode";

export default TokenNode;
