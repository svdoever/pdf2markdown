export interface OpenAiRestInfo {
  uri: string;
  headerKey: string;
  headerValue: string;
  model?: string; // for Azure no model is needed, defined in deployment
}
