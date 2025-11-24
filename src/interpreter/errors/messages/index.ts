import type { AllErrorCodes } from "../base";
import { messages } from "./en";

export const getMessage = (
  code: AllErrorCodes | string,
  data?: Record<string, unknown>,
): string => {
  const template = messages[code];
  if (!template) {
    return `Unknown error: ${code}`;
  }
  if (typeof template === "function") {
    return template(data || {});
  }
  return template;
};

export const isValidErrorCode = (code: string): code is AllErrorCodes => {
  return code in messages;
};

export type { MessageFunction, MessageMap, MessageTemplate } from "./types";
