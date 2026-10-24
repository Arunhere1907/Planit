type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private format(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [PlanIt]: ${message}${metaString}`;
  }

  public debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== "production") {
      process.stdout.write(`${this.format("debug", message, meta)}\n`);
    }
  }

  public info(message: string, meta?: unknown): void {
    process.stdout.write(`${this.format("info", message, meta)}\n`);
  }

  public warn(message: string, meta?: unknown): void {
    process.stderr.write(`${this.format("warn", message, meta)}\n`);
  }

  public error(message: string, error?: unknown): void {
    const errDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
    process.stderr.write(`${this.format("error", message, errDetails)}\n`);
  }
}

export const logger = new Logger();
