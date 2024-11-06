import type { ProcessingDocument } from "../types/ProcessingDocument.ts";
import { pathExists } from "./pathExists.ts";

const defaultJpegToMarkdownVisionPrompt = `
Give me the markdown text output from this page in a PDF using formatting to match the structure of the page as close as you can get. 
Only output the markdown and nothing else. Do not explain the output, just return it. Do not use a single # for a heading. 
All headings will start with ## or ###. Convert tables to markdown tables. Describe charts as best you can. 
DO NOT return in a codeblock. Just return the raw text in markdown format.
`;

const defaultCleanMarkdownPrompt = `
You are tasked with cleaning up the following markdown text. 
You should return only the cleaned-up markdown text. 
Do not explain your output or reasoning. 
Remove any irrelevant text from the markdown, returning the cleaned-up version of the content. 
Examples include any images []() or 'click here' or 'Listen to this article' or page numbers or logos.
`;

export function getDefaultJpegToMarkdownVisionPrompt(): string {
    return defaultJpegToMarkdownVisionPrompt;
}

export function getDefaultCleanMarkdownPrompt(): string {
    return defaultCleanMarkdownPrompt;
}

export async function getJpegToMarkdownVisionPrompt(doc: ProcessingDocument): Promise<string> {
    // Check for jpeg2markdown vision prompt file specific for the PDF
    if (await pathExists(doc.fullJpeg2markdownVisionPromptFilePath)) {
        return await Deno.readTextFile(doc.fullJpeg2markdownVisionPromptFilePath);
    }
    // Check for jpeg2markdown vision prompt file for the folder the PDF file is in
    if (await pathExists(doc.fullFolderJpeg2markdownVisionPromptFilePath)) {
        return await Deno.readTextFile(doc.fullFolderJpeg2markdownVisionPromptFilePath);
    }

    // Return the default jpeg2markdown vision prompt
    return defaultJpegToMarkdownVisionPrompt;
}

export async function getCleanMarkdownPrompt(doc: ProcessingDocument): Promise<string> {
    // Check for cleanmarkdown vision prompt file specific for the PDF
    if (await pathExists(doc.fullCleanMarkdownPromptFilePath)) {
        return await Deno.readTextFile(doc.fullCleanMarkdownPromptFilePath);
    }
    // Check for cleanmarkdown vision prompt file for the folder the PDF file is in
    if (await pathExists(doc.fullFolderCleanMarkdownPromptFilePath)) {
        return await Deno.readTextFile(doc.fullFolderCleanMarkdownPromptFilePath);
    }

    // Return the default cleanmarkdown vision prompt
    return defaultCleanMarkdownPrompt;
}
