export interface ProcessingDocument {
  // Full path to the PDF file being processed
  fullPdfPath: string;

  // Relative path to the PDF file being processed
  relativePdfPath: string;

  // Name of the PDF file without the extension
  pdfBaseName: string;

  // Folder where the JPEG pages are created
  fullJpegPagesFolderPath: string;

  // Folder where the Markdown pages are created
  fullMarkdownPagesFolderPath: string;

  // Folder where the cleaned Markdown pages are created
  fullCleanMarkdownPagesFolderPath: string;

  // Full path to the combined Markdown file
  fullCombinedMarkdownFilePath: string;
  // Full path to the jpeg2markdown vision prompt file specific for the PDF
  fullJpeg2markdownVisionPromptFilePath: string;
  // Full path to the jpeg2markdown vision prompt file for the folder the PDF file is in
  fullFolderJpeg2markdownVisionPromptFilePath: string;
  // Full path to the cleanmarkdown vision prompt file specific for the PDF
  fullCleanMarkdownPromptFilePath: string;
  // Full path to the cleanmarkdown vision prompt file for the folder the PDF file is in
  fullFolderCleanMarkdownPromptFilePath: string;
}
