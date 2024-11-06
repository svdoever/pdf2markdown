import { existsSync } from "https://deno.land/std@0.203.0/fs/exists.ts";
import { getOpenAiRestInfo } from "./getOpenAiRestInfo.ts";
import { logPrompt } from "./contextLogger.ts";

const openAiRestInfoChatCompletions = getOpenAiRestInfo("chat/completions");

async function cleanMarkdown(markdown: string, cleanMarkdownPrompt: string, maxRetries = 5): Promise<string> {
  logPrompt("Clean Markdown prompt", cleanMarkdownPrompt);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  headers[openAiRestInfoChatCompletions.headerKey] = openAiRestInfoChatCompletions.headerValue;

  const payload = {
    model: openAiRestInfoChatCompletions.model,
    messages: [
      {
        role: "system",
        content: cleanMarkdownPrompt
      },
      {
        role: "user",
        content: markdown,
      },
    ],
    max_tokens: 4096,
  };

  let retries = 0;
  while (retries <= maxRetries) {
    const response = await fetch(openAiRestInfoChatCompletions.uri, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    } else if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, retries) * 1000; // Exponential backoff

      console.warn(`Received 429. Retrying after ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    } else {
      throw new Error(
        `Error from OpenAI API: ${response.status} - ${response.statusText}`,
      );
    }
  }

  throw new Error("Failed to get a response from OpenAI after retries.");
}

export async function processCleanMarkdown(markdownPath: string, cleanedMarkdownPath: string, cleanMarkdownPrompt: string): Promise<void> {
  if (!existsSync(markdownPath)) {
    console.error(`Markdown not found: ${markdownPath}`);
    return;
  }

  console.log(`Processing ${markdownPath}...`);
  try {
    let markdownContent = await Deno.readTextFile(markdownPath);
    markdownContent = markdownContent.trim();
    let cleanedMarkdownContent = markdownContent;
    if (markdownContent) {
      cleanedMarkdownContent = await cleanMarkdown(markdownContent, cleanMarkdownPrompt);
    }
    await Deno.writeTextFile(cleanedMarkdownPath, cleanedMarkdownContent);
    console.log(`Cleaned Markdown for '${markdownPath}' saved to '${cleanedMarkdownPath}'`);
  } catch (error) {
    console.error(`Error processing '${markdownPath}': ${(error as Error).message}`);
  }
}
