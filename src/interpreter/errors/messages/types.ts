export type MessageFunction = (data: Record<string, unknown>) => string;
export type MessageTemplate = string | MessageFunction;
export type MessageMap = Record<string, MessageTemplate>;
