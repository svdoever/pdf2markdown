import type { ProcessingDocument } from "./ProcessingDocument.ts";

export interface CommanderOptionsBase {
  file: string;
  folder: string;
  dryRun: boolean;
  debug: boolean;
  verbose: boolean;
  silent: boolean;

  processingDocuments: ProcessingDocument[];
};

export interface CommanderOptionsPrompts extends CommanderOptionsBase {
  create: boolean;
}

export type CommanderOptionsCleanIntermediate = CommanderOptionsBase;

export type CommanderOptionsCleanAll = CommanderOptionsBase;

export interface CommanderOptionsConvert extends CommanderOptionsBase {
  dpi: number;
  jpegQuality: number;
  page: string;
  force: boolean;
};

export interface CommanderOptionsPdf2Jpeg extends CommanderOptionsBase {
  dpi: number;
  jpegQuality: number;
};

export interface CommanderOptionsJpegToMarkdown extends CommanderOptionsBase {
  page: string;
};

export interface CommanderOptionsCleanMarkdown extends CommanderOptionsBase {
  page: string;
};

export type CommanderOptionsCombineMarkdown = CommanderOptionsBase;

