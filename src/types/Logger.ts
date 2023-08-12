import chalk from 'chalk';
import { format } from 'ts-date';
import * as console from 'console';

export const LogLevel = {
  success: chalk.green,
  info: chalk.cyan,
  verbose: chalk.blackBright,
  plain: chalk.white,
  link: chalk.underline,
  warning: chalk.yellow,
  error: chalk.red,
};

export class Logger {
  static success(module: string, message: any) {
    this._log('success', module, message);
  }

  static info(module: string, message: any) {
    this._log('info', module, message);
  }

  // noinspection JSUnusedGlobalSymbols
  static hint(module: string, message: any) {
    this._log('verbose', module, message);
  }

  static log(module: string, message: any) {
    this._log('plain', module, message);
  }

  static warn(module: string, message: any, reason?: any, hint?: any) {
    this._log('warning', module, message, reason, hint);
  }

  static error(module: string, message: any, reason?: any, hint?: any) {
    this._log('error', module, message, reason, hint);
  }

  private static _log(
    type: 'success' | 'info' | 'verbose' | 'plain' | 'warning' | 'error',
    module: string,
    message: any,
    reason?: any,
    hint?: any,
  ): void {
    const baseColor = LogLevel[type];
    const offsetString = ''.repeat(27 + module.length);
    let result =
      LogLevel.verbose(`[${format(new Date(), 'YYYY/MM/DD HH:mm:ss.SSS')}] `) +
      baseColor(`│${module}│ `) +
      message;
    if (reason) {
      result += ` due to: \n` + ' '.repeat(27 + module.length);
      if (hint) {
        result += `${baseColor('├')} ${reason}\n`;
      } else {
        result += `${baseColor('└')} ${reason}`;
      }
    }
    if (hint) {
      result += `${offsetString}${baseColor('├')} ${LogLevel.info(
        'Suggestions below: \n',
      )}${offsetString}`;
      result += `└ ${hint.replaceAll('\n', `\n  ${offsetString}`)}`;
    }
    console.log(result);
  }
}
