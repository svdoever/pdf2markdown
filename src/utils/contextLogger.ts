import * as logger from "npm:loglevel";
import chalk from "npm:chalk";

export function logDebug(message: string): void {
    logger.default.debug(message);
}

export function logWarn(message: string): void {
    logger.default.warn(message);
}

export function logInfo(message: string): void {
    logger.default.info(message);
}

export function logError(message: string): void {
    logger.default.error(message);
}

export function logPrompt(promptDescription: string, prompt: string): void {
    logger.default.info(`${chalk.bold.blue(promptDescription)}:\n${chalk.blue(prompt)}`);
}

export function logOptions(options: Record<string, string | boolean>): void {
    const optionsString = JSON.stringify(options, null, 2);
    logger.default.info(`${chalk.bold.blue("Options:")}\n${chalk.blue(optionsString)}\n`);
}

export function logExpandedOptions(options: Record<string, string | boolean>): void {
    const optionsString = JSON.stringify(options, null, 2);
    logger.default.debug(`${chalk.bold.blue("Expanded options (st://... resolved):")}\n${chalk.blue(optionsString)}\n`);
}

export function logPromptData(promptData: unknown): void {
    const promptDataString = JSON.stringify(promptData, null, 2);
    logger.default.info(`${chalk.bold.blue("Prompt data:")}\n${chalk.blue(promptDataString)}\n`);
}

export function logPromptTemplate(prompt: string): void {
    logger.default.info(`${chalk.bold.gray("Prompt template:")}\n-------------------\n${chalk.gray(prompt.trim())}\n-------------------\n`);
}

export function logConstructedPrompt(prompt: string): void {
    logger.default.info(`${chalk.bold.hex("#FFA500")("Prompt:")}\n-------------------\n${chalk.hex("#FFA500")(prompt.trim())}\n-------------------\n`);
}

export function logCompletion(completion: string, showForce: boolean): void {
    const logFunc = showForce ? console.log : logger.default.info;
    logFunc(`${chalk.bold.green("Completion:")}\n-------------------\n${chalk.green(completion)}\n-------------------\n`);
}