import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";
import type { ProcessingDocument } from "../types/ProcessingDocument.ts";
import { processCleanMarkdown } from "../utils/cleanMarkdown.ts";
import { getCleanMarkdownPrompt } from "../utils/getPrompt.ts";

export async function doCleanMarkdown(
  doc: ProcessingDocument,
  page?: string,
  dryRun = false,
  verbose = false,
): Promise<void> {
  if (!dryRun) {
    await fs.ensureDir(doc.fullCleanMarkdownPagesFolderPath);
  }

  // Get the list of pages to process
  const pagesToProcess: string[] = page ? [`page-${String(page).padStart(3, "0")}.md`] : await getMarkdownPages(doc.fullMarkdownPagesFolderPath);

  // Process each page
  for (const pageMarkdownFile of pagesToProcess) {
    await processPage(pageMarkdownFile, doc, dryRun, verbose);
  }
}

async function getMarkdownPages(directoryPath: string): Promise<string[]> {
  const pages = [];
  for await (const entry of Deno.readDir(directoryPath)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      pages.push(entry.name);
    }
  }
  return pages.sort();
}

async function processPage(
  pageMdFile: string,
  doc: ProcessingDocument,
  dryRun: boolean,
  verbose: boolean,
) {
  const pageCleanMdFile = pageMdFile;

  if (dryRun) {
    console.log(
      `Simulating cleanmarkdown for PDF document '${doc.relativePdfPath}' page '${pageMdFile}'`,
    );
    return;
  }

  if (verbose) {
    console.log(
      `Cleaning Markdown: '${doc.relativePdfPath}' page '${pageMdFile}'`,
    );
  }

  try {
    const cleanMarkdownPrompt = await getCleanMarkdownPrompt(doc);
    await processCleanMarkdown(
      path.join(doc.fullMarkdownPagesFolderPath, pageMdFile),
      path.join(doc.fullCleanMarkdownPagesFolderPath, pageCleanMdFile),
      cleanMarkdownPrompt
    );
    if (verbose) {
      console.log(`Converted to clean Markdown.`);
    }
  } catch (error) {
    console.error(
      `Error processing '${doc.relativePdfPath}' page '${pageMdFile}': ${error}`,
    );
  }
}
