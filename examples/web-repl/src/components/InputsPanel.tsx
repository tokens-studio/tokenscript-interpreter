import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect } from "react";
import { type InputDefinition, inputsDataAtom } from "../store/atoms";
import Select from "./Select";

const TYPE_OPTIONS = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "color", label: "Color" },
];

interface InputsPanelProps {
  onInputsChange?: (inputs: Record<string, any>) => void;
  initialInputs?: InputDefinition[];
}

const InputsPanel: React.FC<InputsPanelProps> = ({ onInputsChange, initialInputs = [] }) => {
  const [inputs, setInputs] = useAtom(inputsDataAtom);

  // Initialize from initialInputs if provided (only on first mount)
  useEffect(() => {
    if (initialInputs.length > 0) {
      setInputs(initialInputs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inputs changes with parent component
  useEffect(() => {
    const inputRecord = inputs.reduce(
      (acc, input) => {
        acc[input.name] = input.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    onInputsChange?.(inputRecord);
  }, [inputs, onInputsChange]);

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const newInputs = [...inputs];
      newInputs[index] = { ...newInputs[index], name };
      setInputs(newInputs);
    },
    [inputs],
  );

  const handleTypeChange = useCallback(
    (index: number, type: InputDefinition["type"]) => {
      const newInputs = [...inputs];
      // Reset value based on type
      const newValue =
        type === "string" ? "" : type === "number" ? 0 : type === "boolean" ? false : "#000000";

      newInputs[index] = {
        ...newInputs[index],
        type,
        value: newValue,
      };
      setInputs(newInputs);
    },
    [inputs],
  );

  const handleValueChange = useCallback(
    (index: number, value: string | number | boolean) => {
      const newInputs = [...inputs];
      newInputs[index] = { ...newInputs[index], value };
      setInputs(newInputs);
    },
    [inputs],
  );

  const addInput = () => {
    const newInputName = `input${inputs.length + 1}`;
    setInputs((prevInputs) => [...prevInputs, { name: newInputName, type: "string", value: "" }]);
  };

  const removeInput = useCallback(
    (index: number) => {
      const newInputs = inputs.filter((_, i) => i !== index);
      setInputs(newInputs);
    },
    [inputs],
  );

  const renderInputField = (input: InputDefinition, index: number) => {
    switch (input.type) {
      case "string":
        return (
          <input
            type="text"
            value={input.value as string}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded"
            placeholder={`Enter ${input.name}`}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={input.value as number}
            onChange={(e) => handleValueChange(index, Number(e.target.value))}
            className="w-full px-2 py-1 text-xs border rounded"
            placeholder={`Enter ${input.name}`}
          />
        );
      case "boolean":
        return (
          <Select
            value={String(input.value)}
            onChange={(value) => handleValueChange(index, value === "true")}
            options={[
              { value: "true", label: "True" },
              { value: "false", label: "False" },
            ]}
            className="w-full"
          />
        );
      case "color":
        return (
          <input
            type="color"
            value={input.value as string}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">Inputs</h3>
        <button
          onClick={addInput}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          + Add Inputs
        </button>
      </div>
      <div className={"space-y-2"}>
        {inputs.map((input, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center"
          >
            <input
              type="text"
              value={input.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded"
              placeholder="Input name"
            />
            <Select
              value={input.type}
              onChange={(value) => handleTypeChange(index, value as InputDefinition["type"])}
              options={TYPE_OPTIONS}
              className="w-full"
            />
            <div>{renderInputField(input, index)}</div>
            <button
              onClick={() => removeInput(index)}
              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputsPanel;
