import * as base64 from "jsr:@std/encoding/base64";
import { getOpenAiRestInfo } from "./getOpenAiRestInfo.ts";
import { pathExists } from "./pathExists.ts";
import { logPrompt } from "./contextLogger.ts";

const openAiRestInfoChatCompletions = getOpenAiRestInfo("chat/completions");

async function encodeImageToBase64(imagePath: string): Promise<string> {
  const imageFile = await Deno.readFile(imagePath);
  return base64.encodeBase64(imageFile);
}

async function jpeg2Markdown(base64Image: string, jpeg2markdownVisionPrompt: string, maxRetries = 5): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  headers[openAiRestInfoChatCompletions.headerKey] = openAiRestInfoChatCompletions.headerValue;

  const payload = {
    model: openAiRestInfoChatCompletions.model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: jpeg2markdownVisionPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
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

export async function processJpeg2Markdown(imagePath: string, markdownPath: string, jpeg2markdownVisionPrompt: string): Promise<void> {
  if (!pathExists(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    return;
  }

  console.log(`Processing ${imagePath}...`);
  logPrompt("Jpeg to Markdown vision prompt", jpeg2markdownVisionPrompt);
  try {
    const base64Image = await encodeImageToBase64(imagePath);
    const markdownContent = await jpeg2Markdown(base64Image, jpeg2markdownVisionPrompt);
    await Deno.writeTextFile(markdownPath, markdownContent);
    console.log(`Markdown for '${imagePath}' saved to '${markdownPath}'`);
  } catch (error) {
    console.error(`Error processing '${imagePath}': ${(error as Error).message}`);
  }
}
