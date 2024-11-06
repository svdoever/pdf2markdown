import type { OpenAiRestInfo } from "../types/OpenAiRestInfo.ts";

export function getOpenAiRestInfo(relativeUri: string): OpenAiRestInfo {
  const llmProvider = Deno.env.get("LLM_PROVIDER");
  if (!llmProvider) {
    console.error("Error: LLM_PROVIDER not set in .env file");
    Deno.exit(1);
  }
  switch (llmProvider) {
    case "AZURE_OPENAI": {
      const azureOpenAiEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
      const azureOpenAiDeployment = Deno.env.get("AZURE_OPENAI_DEPLOYMENT");
      const azureOpenAiApiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION");
      const azureOpenAiApiKey = Deno.env.get("AZURE_OPENAI_API_KEY");

      if (!azureOpenAiEndpoint) {
        console.error("Error: AZURE_OPENAI_ENDPOINT not set in .env file");
        Deno.exit(1);
      }
      if (!azureOpenAiDeployment) {
        console.error("Error: AZURE_OPENAI_DEPLOYMENT not set in .env file");
        Deno.exit(1);
      }
      if (!azureOpenAiApiVersion) {
        console.error("Error: AZURE_OPENAI_API_VERSION not set in .env file");
        Deno.exit(1);
      }
      if (!azureOpenAiApiKey) {
        console.error("Error: AZURE_OPENAI_API_KEY not set in .env file");
        Deno.exit(1);
      }

      return {
        uri: `${azureOpenAiEndpoint}/openai/deployments/${azureOpenAiDeployment}/${relativeUri}?api-version=${azureOpenAiApiVersion}`,
        headerKey: "api-key",
        headerValue: azureOpenAiApiKey,
      };
    }
    case "OPENAI": {
      const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiApiKey) {
        console.error("Error: OPENAI_API_KEY not set in .env file");
        Deno.exit(1);
      }
      const openAiModel = Deno.env.get("OPENAI_MODEL");
      if (!openAiModel) {
        console.error("Error: OPENAI_MODEL not set in .env file");
        Deno.exit(1);
      }

      return {
        uri: `https://api.openai.com/v1/${relativeUri}`,
        headerKey: "Authorization",
        headerValue: `Bearer ${openAiApiKey}`,
        model: openAiModel,
      };
    }

    default: {
      console.error(`Unknown LLM provider: ${llmProvider}`);
      Deno.exit(1);
    }
  }
}
