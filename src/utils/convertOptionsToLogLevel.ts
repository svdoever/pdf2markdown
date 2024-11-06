import * as logger from "npm:loglevel";
import type { CommanderOptionsBase } from "../types/CommanderOptions.ts";
export function convertOptionsToLogLevel(options: CommanderOptionsBase) {
    if (options.debug) {
        logger.default.setLevel("debug");
    }
    if (options.silent) {
        logger.default.setLevel("silent");
    }
    if (options.verbose) {
        logger.default.setLevel("info");
    }
}