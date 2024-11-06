import { Command } from "npm:commander";
import type { CommanderOptionsBase, CommanderOptionsCleanAll, CommanderOptionsCleanIntermediate, CommanderOptionsCleanMarkdown, CommanderOptionsCombineMarkdown, CommanderOptionsConvert, CommanderOptionsJpegToMarkdown, CommanderOptionsPdf2Jpeg, CommanderOptionsPrompts } from "./types/CommanderOptions.ts";
import type { ProcessingDocument } from "./types/ProcessingDocument.ts";
import { doPdf2Jpeg } from "./commands/doPdf2Jpeg.ts";
import { doJpeg2Markdown } from "./commands/doJpeg2Markdown.ts";
import { doCleanMarkdown } from "./commands/doCleanMarkdown.ts";
import { doCombineMarkdown } from "./commands/doCombineMarkdown.ts";
import { pathExists } from "./utils/pathExists.ts";
import { removePath } from "./utils/removePath.ts";
import { convertOptionsToLogLevel } from "./utils/convertOptionsToLogLevel.ts";
import { logDebug } from "./utils/contextLogger.ts";
import { getDefaultCleanMarkdownPrompt, getDefaultJpegToMarkdownVisionPrompt } from "./utils/getPrompt.ts";

// Get the Ghostscript path from environment variables
const ghostscriptPath = Deno.env.get("GHOSTSCRIPT_PATH");

if (!ghostscriptPath) {
  console.error("Error: GHOSTSCRIPT_PATH not set in .env file");
  Deno.exit(1);
}

function validateOptions(options: CommanderOptionsBase): void {
  if (!options.file && !options.folder) {
    console.error("Error: Either --file or --folder parameter is required");
    Deno.exit(1);
  }

  if (options.file && options.folder) {
    console.error("Error: Only one of --file or --folder parameter can be specified");
    Deno.exit(1);
  }

  if (options.file && !options.file.toLowerCase().endsWith(".pdf")) {
    console.error("Error: --file parameter must be a PDF file");
    Deno.exit(1);
  }

  if (options.file) {
    try {
      const fileStats = Deno.statSync(options.file);
      if (!fileStats.isFile) {
        console.error("Error: --file parameter must be a file");
        Deno.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${options.file} does not exist: ${(error as Error).message}`);
      Deno.exit(1);
    }
  }
  if (options.folder) {
    try {
      const folderStats = Deno.statSync(options.folder);
      if (!folderStats.isDirectory) {
        console.error("Error: --folder parameter must be a folder");
        Deno.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${options.folder} does not exist: ${(error as Error).message}`);
      Deno.exit(1);
    }
  }
}

function getListOfPdfFiles(options: CommanderOptionsBase): string[] {
  if (options.file) {
    return [options.file];
  } else {
    return getListOfPdfFilesRecursively(options.folder);
  }
}

function getListOfPdfFilesRecursively(folder: string): string[] {
  const pdfFiles: string[] = [];
  for (const entry of Deno.readDirSync(folder)) {
    const entryPath = `${folder}/${entry.name}`;
    if (entry.isDirectory) {
      pdfFiles.push(...getListOfPdfFilesRecursively(entryPath));
    } else if (entry.isFile && entry.name.toLowerCase().endsWith(".pdf")) {
      pdfFiles.push(entryPath);
    }
  }
  return pdfFiles;
}

function validateOptionsAndGetDocumentsToProcess(options: CommanderOptionsBase): ProcessingDocument[] {
  validateOptions(options);
  const pdfFiles = getListOfPdfFiles(options);
  if (options.verbose) {
    console.log(`PDF files to process: ${pdfFiles}`);
  }

  const processingDocuments: ProcessingDocument[] = pdfFiles.map((relativePdfPath: string): ProcessingDocument => {
    const pdfBaseName = relativePdfPath
      .split("/")
      .pop()
      ?.replace(/\.pdf$/i, "");
    if (!pdfBaseName) {
      throw new Error(`Error: Unable to extract PDF base name from ${relativePdfPath}`);
    }
    // get full path of a given PDF file
    const fullPdfPath = Deno.realPathSync(relativePdfPath);
    const fullPathBase = fullPdfPath
      .split("/")
      .pop()
      ?.replace(/\.pdf$/i, "");
    if (!fullPathBase) {
      throw new Error(`Error: Unable to extract PDF full path base from ${fullPdfPath}`);
    }
    // Path containing the PDF document we are processing
    const folderPath = fullPdfPath.substring(0, fullPdfPath.lastIndexOf("/"));
    const fullJpegPagesFolderPath = `${fullPathBase}.pages_jpeg`;
    const fullMarkdownPagesFolderPath = `${fullPathBase}.pages_md`;
    const fullCleanMarkdownPagesFolderPath = `${fullPathBase}.pages_clean_md`;
    const fullCombinedMarkdownFilePath = `${fullPathBase}.md`;
    const fullJpeg2markdownVisionPromptFilePath = `${fullPathBase}.jpeg2markdown_vision_prompt.txt`;
    const fullFolderJpeg2markdownVisionPromptFilePath = `${folderPath}/jpeg2markdown_vision_prompt.txt`;
    const fullCleanMarkdownPromptFilePath = `${fullPathBase}.cleanmarkdown_prompt.txt`;
    const fullFolderCleanMarkdownPromptFilePath = `${folderPath}/cleanmarkdown_prompt.txt`;

    return {
      fullPdfPath,
      relativePdfPath,
      pdfBaseName,
      fullJpegPagesFolderPath,
      fullMarkdownPagesFolderPath,
      fullCleanMarkdownPagesFolderPath,
      fullCombinedMarkdownFilePath,
      fullJpeg2markdownVisionPromptFilePath,
      fullFolderJpeg2markdownVisionPromptFilePath,
      fullCleanMarkdownPromptFilePath,
      fullFolderCleanMarkdownPromptFilePath
    };
  });

  return processingDocuments;
}


// Setup command line interface
const program = new Command();
program
  .name("pdf2markdown")
  .version("0.1.0")
  .description(
    `
Convert PDF file(s) to Markdown format. Either a single PDF file or a folder of PDF files can be processed.

The conversion goes through four stages that can be executed as seperate subcommands:
1. pdf2jpeg: convert a PDF file to a set of JPEG images in a folder next to the PDF file, e.g. mydoc.pdf -> mydoc.pages_jpeg/page-001.jpg
2. jpeg2markdown: each JPEG image to a Markdown file with the same name, e.g. mydoc.pages_jpeg/page-001.jpg -> mydoc.pages_md/page-001.md
3. cleanmarkdown: cleanup the Markdown files, e.g. mydoc.pages_md/page-001.md -> mydoc.pages_clean_md/page-001.md
4. combinemarkdown: combine all PDF document Markdown files into a single Markdown file, e.g. mydoc.pages_clean_md/page-001.md -> mydoc.md

The 'convert' command will do a complete conversion of the PDF file(s) to Markdown format.

To clean up intermediate files from the conversion process, excluding the end-result markdown files, use the 'cleanintermediate' command.
To clean up all files from the conversion process, including the end-result markdown files, use the 'cleanall' command.
To show the default jpeg2markdown vision prompt and cleanmarkdown prompt, use the 'prompts' command.

It is possible to override the default prompts per PDF file or for all PDF files in a folder.
Create a file named '<myPdfBasePath>.jpeg2markdown_vision_prompt.txt' or '<myPdfBasePath>.cleanmarkdown_prompt.txt' next to the pdf file.
Create a file named 'jpeg2markdown_vision_prompt.txt' or 'cleanmarkdown_prompt.txt' in the same folder as the PDF files.
`
  );

program
  .command("prompts")
  .description("Show the default jpeg2markdown vision prompt and cleanmarkdown prompt and optionally create prompt files with default prompts")
  .option("--create", "Create prompt files with default prompts (for modification) for specified file or folder", false)
  .action(async (options: CommanderOptionsPrompts) => {
    const defaultJpegToMarkdownVisionPrompt = getDefaultJpegToMarkdownVisionPrompt();
    console.log(`jpeg2markdown vision prompt:\n${defaultJpegToMarkdownVisionPrompt}\n`);
    const defaultCleanMarkdownPrompt = getDefaultCleanMarkdownPrompt();
    console.log(`cleanmarkdown prompt:\n${defaultCleanMarkdownPrompt}\n`);

    if (options.create) {
      if (options.folder) {
        if (await pathExists(options.folder)) {
          console.log(`Creating prompt files with default prompts for all PDF files in folder '${options.folder}'...`);
          Deno.writeTextFileSync(`${options.folder}/jpeg2markdown_vision_prompt.txt`, defaultJpegToMarkdownVisionPrompt);
          Deno.writeTextFileSync(`${options.folder}/cleanmarkdown_prompt.txt`, defaultCleanMarkdownPrompt);
          console.log("Prompt files created.");
        } else {
          console.error(`Error: Folder '${options.folder}' does not exist`);
        }
      }

      if (options.file) {
        if (await pathExists(options.file)) {
          const pdfBasePath = options.file.replace(/\.pdf$/i, "");
          console.log(`Creating prompt files with default prompts for PDF file '${options.file}'...`);
          Deno.writeTextFileSync(`${pdfBasePath}.jpeg2markdown_vision_prompt.txt`, defaultJpegToMarkdownVisionPrompt);
          Deno.writeTextFileSync(`${pdfBasePath}.cleanmarkdown_prompt.txt`, defaultCleanMarkdownPrompt);
          console.log("Prompt files created.");
        } else {
          console.error(`Error: File '${options.file}' does not exist`);
        }
      }
    }
  });

program
  .command("cleanintermediate")
  .description("Clean up intermediate files from the conversion process, excluding the end-result markdown files")
  .action(async (options: CommanderOptionsCleanIntermediate) => {
    convertOptionsToLogLevel(options);
    logDebug(`cleanintermediate options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      if (options.dryRun || options.verbose) {
        console.log(`Cleaning intermediate files for PDF document '${doc.relativePdfPath}'`);
      } else {
        await removePath(doc.fullJpegPagesFolderPath);
        await removePath(doc.fullMarkdownPagesFolderPath);
        await removePath(doc.fullCleanMarkdownPagesFolderPath);
      }
    }
  });

program
  .command("cleanall")
  .description("Clean up all files from the conversion process, including the end-result markdown files")
  .action(async (options: CommanderOptionsCleanAll) => {
    convertOptionsToLogLevel(options);
    logDebug(`cleanall options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      if (options.dryRun) {
        console.log(`DRYRUN: Cleaning all generated files for PDF document '${doc.relativePdfPath}'`);
      } else {
        if (options.verbose) {
          console.log(`Cleaning all generated files for PDF document '${doc.relativePdfPath}'`);
        }
        await removePath(doc.fullJpegPagesFolderPath);
        await removePath(doc.fullMarkdownPagesFolderPath);
        await removePath(doc.fullCleanMarkdownPagesFolderPath);
        await removePath(doc.fullCombinedMarkdownFilePath);
      }
    }
  });

program
  .command("convert", { isDefault: true })
  .description("Convert PDF file(s) to Markdown format using Vision and text LLMs")
  .option("--dpi <dpi>", "DPI resolution for the JPEG images", "150")
  .option("--jpeg-quality <quality>", "Quality of the JPEG images", "70")
  .option("--page <page number>", "Process a single page with the Vision and text LLMs (for testing)")
  .option("--force", "Redo complete conversion if combined markdown already exists", false)
  .action(async (options: CommanderOptionsConvert) => {
    convertOptionsToLogLevel(options);
    logDebug(`convert options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      const combinedMarkdownExists = await pathExists(doc.fullCombinedMarkdownFilePath);
      if (options.force) {
        console.log(`Force option enabled, removing existing combined Markdown file: ${doc.fullCombinedMarkdownFilePath}`);
        await removePath(doc.fullCombinedMarkdownFilePath);
      } else {
        if (combinedMarkdownExists) {
          console.log(`Combined Markdown file already exists: '${doc.fullCombinedMarkdownFilePath}' [SKIP]`);
          continue;
        }
      }

      await doPdf2Jpeg(doc, options.dpi, options.jpegQuality, options.dryRun, options.verbose);
      await doJpeg2Markdown(doc, options.page, options.dryRun, options.verbose);
      await doCleanMarkdown(doc, options.page, options.dryRun, options.verbose);
      await doCombineMarkdown(doc, options.dryRun, options.verbose);
    }
  });

program
  .command("pdf2jpeg")
  .description("Convert pages of PDF file(s) to JPEG format")
  .option("--dpi <dpi>", "DPI resolution for the JPEG images", "150")
  .option("--jpeg-quality <quality>", "Quality of the JPEG images", "70")
  .action(async (options: CommanderOptionsPdf2Jpeg) => {
    convertOptionsToLogLevel(options);
    logDebug(`pdf2jpeg options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      await doPdf2Jpeg(doc, options.dpi, options.jpegQuality, options.dryRun, options.verbose);
    }
  });

program
  .command("jpeg2markdown")
  .description("Convert JPEG images to Markdown format using Vision LLM")
  .option("--page <page number>", "Process a single page")

  .action(async (options: CommanderOptionsJpegToMarkdown) => {
    convertOptionsToLogLevel(options);
    logDebug(`jpeg2markdown options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      await doJpeg2Markdown(doc, options.page, options.dryRun, options.verbose);
    }
  });

program
  .command("cleanmarkdown")
  .description("Clean up Markdown page files using text LLM")
  .option("--page <page number>", "Process a single page")
  .action(async (options: CommanderOptionsCleanMarkdown) => {
    convertOptionsToLogLevel(options);
    logDebug(`cleanmarkdown options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      await doCleanMarkdown(doc, options.page, options.dryRun, options.verbose);
    }
  });

program
  .command("combinemarkdown")
  .description("Combine Markdown files into a single Markdown file")
  .action(async (options: CommanderOptionsCombineMarkdown) => {
    convertOptionsToLogLevel(options);
    logDebug(`combinemarkdown options: ${JSON.stringify(options, null, 2)}`);
    const docs = validateOptionsAndGetDocumentsToProcess(options);
    for (const doc of docs) {
      await doCombineMarkdown(doc, options.dryRun, options.verbose);
    }
  });

// Add common options to all commands
program.commands.forEach((command) => {
  command.option("--file <PDF file>", "Process a single PDF file")
  command.option("--folder <folder with PDF files>", "Process a folder of PDF files")
  command.option("--dry-run", "Simulate the conversion process without making calls to LLMs and writing any files", false);
  command.option("--debug", "Output debug information of each step", false);
  command.option("--verbose", "Output detailed information of each step", true);
  command.option("--silent", "Output minimal information of each step", false);
});

program.parse(Deno.args, { from: "user" }); // In Deno we only get the args from the user
