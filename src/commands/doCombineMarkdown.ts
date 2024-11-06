import * as path from "jsr:@std/path";
import type { ProcessingDocument } from "../types/ProcessingDocument.ts";

export async function doCombineMarkdown(
  doc: ProcessingDocument,
  dryRun = false,
  verbose = false,
): Promise<void> {
  if (dryRun) {
    console.log(
      `Simulating combinemarkdown for PDF document '${doc.relativePdfPath}'`,
    );
    return;
  }

  if (verbose) {
    console.log(
      `Combining Markdown: '${doc.relativePdfPath}'`,
    );
  }

  // Get the list of pages to process
  const pagesToProcess: string[] = await getCleanMarkdownPages(doc.fullCleanMarkdownPagesFolderPath);

  // Combine the content of the pages
  let combinedMarkdown = "";
  for (const pageMarkdownFile of pagesToProcess) {
    const pageContent = await Deno.readTextFile(path.join(doc.fullCleanMarkdownPagesFolderPath, pageMarkdownFile));
    combinedMarkdown += pageContent + "\n";
  }

  await Deno.writeTextFile(doc.fullCombinedMarkdownFilePath, combinedMarkdown);
}

async function getCleanMarkdownPages(directoryPath: string): Promise<string[]> {
  const pages = [];
  for await (const entry of Deno.readDir(directoryPath)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      pages.push(entry.name);
    }
  }
  return pages.sort();
}
