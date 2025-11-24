export enum ConfigErrorCode {
  NO_SPEC_FOUND = "CFG_NO_SPEC_FOUND",
  NO_TYPE_FOUND = "CFG_NO_TYPE_FOUND",
}

export interface ConfigErrorData {
  [ConfigErrorCode.NO_SPEC_FOUND]: {
    specName: string;
  };
  [ConfigErrorCode.NO_TYPE_FOUND]: {
    typeName: string;
  };
}
