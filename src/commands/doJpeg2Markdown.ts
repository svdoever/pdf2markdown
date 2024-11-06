import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import type { ProcessingDocument } from "../types/ProcessingDocument.ts";
import { processJpeg2Markdown } from "../utils/jpeg2markdown.ts";
import { getJpegToMarkdownVisionPrompt } from "../utils/getPrompt.ts";

export async function doJpeg2Markdown(doc: ProcessingDocument, page?: string, dryRun = false, verbose = false): Promise<void> {
  if (!dryRun) {
    await fs.ensureDir(doc.fullMarkdownPagesFolderPath);
  }

  // Get the list of pages to process
  const pagesToProcess: string[] = page ? [`page-${String(page).padStart(3, "0")}.jpg`] : await getJpegPages(doc.fullJpegPagesFolderPath);

  // Process each page
  for (const pageJpgFile of pagesToProcess) {
    await processPage(pageJpgFile, doc, dryRun, verbose);
  }
}

async function getJpegPages(directoryPath: string): Promise<string[]> {
  const pages = [];
  for await (const entry of Deno.readDir(directoryPath)) {
    if (entry.isFile && entry.name.endsWith(".jpg")) {
      pages.push(entry.name);
    }
  }
  return pages.sort();
}

async function processPage(pageJpgFile: string, doc: ProcessingDocument, dryRun: boolean, verbose: boolean) {
  const pageMdFile = pageJpgFile.replace(".jpg", ".md");

  if (dryRun) {
    console.log(`Simulating jpeg2markdown for PDF document '${doc.relativePdfPath}' page '${pageJpgFile}'`);
    return;
  }

  if (verbose) {
    console.log(`Converting to Markdown: '${doc.relativePdfPath}' page '${pageJpgFile}'`);
  }

  try {
    const jpeg2markdownVisionPrompt = await getJpegToMarkdownVisionPrompt(doc);
    await processJpeg2Markdown(
      path.join(doc.fullJpegPagesFolderPath, pageJpgFile), 
      path.join(doc.fullMarkdownPagesFolderPath, pageMdFile),
      jpeg2markdownVisionPrompt
    );
    if (verbose) {
      console.log(`Converted to Markdown.`);
    }
  } catch (error) {
    console.error(`Error processing '${doc.relativePdfPath}' page '${pageJpgFile}': ${error}`);
  }
}
