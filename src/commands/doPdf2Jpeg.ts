import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import type { ProcessingDocument } from "../types/ProcessingDocument.ts";

export async function doPdf2Jpeg(
  doc: ProcessingDocument,
  dpi: number,
  jpegQuality: number,
  dryRun: boolean,
  verbose: boolean,
) {
  const ghostscriptPath = Deno.env.get("GHOSTSCRIPT_PATH");
  if (!dryRun) {
    await fs.ensureDir(doc.fullJpegPagesFolderPath);
  }
  const ghostscriptOutputFile = path.join(doc.fullJpegPagesFolderPath, "page-%03d.jpg");
  const ghostscriptCommand = `${ghostscriptPath}`;
  const ghostscriptArguments = [
    "-dNOPAUSE",
    "-sDEVICE=jpeg",
    `-dJPEGQ=${jpegQuality}`,
    `-r${dpi}`,
    `-sOutputFile=${ghostscriptOutputFile}`,
    `${doc.fullPdfPath}`,
    "-c quit",
  ];

  if (dryRun) {
    console.log(`Simulating pdf2jpeg for PDF document '${doc.relativePdfPath}'`);
    console.log(`Executing command: ${ghostscriptCommand} ${ghostscriptArguments.join(" ")}`);
  } else {
    if (verbose) {
      console.log(`Executing command: ${ghostscriptCommand} ${ghostscriptArguments.join(" ")}`);
    }
    const command = new Deno.Command(ghostscriptCommand, {
      args: ghostscriptArguments,
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stdout } = await command.output();
    console.log(success);
    console.log(new TextDecoder().decode(stdout));

    if (!success) {
      console.error(`Error processing '${doc.relativePdfPath}': ${stdout}`);
    } else if (verbose) {
      console.log(`Converted: ${doc.relativePdfPath}`);
    }
  }
}
