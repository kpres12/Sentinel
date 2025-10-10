/**
 * Logger utility for edge agent.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private context: string
  private logLevel: LogLevel

  constructor(context: string, logLevel: LogLevel = LogLevel.INFO) {
    this.context = context
    this.logLevel = logLevel
  }

  debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, ...args)
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`
    
    if (args.length > 0) {
      console.log(logMessage, ...args)
    } else {
      console.log(logMessage)
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }
}
