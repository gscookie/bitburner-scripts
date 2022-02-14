import { NS } from '@ns'
import { asStr } from '/lib/util';

export type NSLogLevels = "none" | "success" | "debug" | "info" | "warn" | "error"

const logLevelsDisplay: { [k: string]: string } = {
    none: "       ",
    success: "SUCCESS",
    debug:   "  DEBUG",
    info:    "   INFO",
    warn: "   WARN",
    error: "  ERROR"
}

export class NSLogger {
    ns: NS | undefined;
    printFunc: (msg: string) => void;
    defaultTerminalPrint: boolean;
    defaultScriptLogPrint: boolean;

    constructor() {
        this.ns = undefined
        this.printFunc = () => { true } // NOOP until we have NS
        this.defaultScriptLogPrint = true
        this.defaultTerminalPrint = false
    }

    init(ns: NS): void {
        this.ns = ns
        this.printFunc = (msg: string) => (this.ns as NS).print(msg)
    }

    static formatMsg(msg: unknown, level: NSLogLevels = "none"): string {
        return `${logLevelsDisplay[level]} [${(new Date()).toLocaleTimeString()}] ${asStr(msg)}`
    }

    // Print Functions //
    
    success(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "success"))
    }
    
    debug(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "debug"))
    }

    info(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "info"))
    }

    warn(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "warn"))
    }

    error(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "error"))
    }

    print(msg: unknown): void {
        this.printFunc(NSLogger.formatMsg(msg, "none"))
    }
}

export const LOGGER: NSLogger = new NSLogger()