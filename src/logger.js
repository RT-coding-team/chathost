const moment = require('moment-timezone');
const winston = require('winston');

class Logger {
    constructor(output) {
        this.consoleLogger = output === 'console';
        this.logger = this.consoleLogger
            ? console
            : winston.createLogger({
                  transports: [new winston.transports.Console()]
              });
    }
    log(type, message) {
        if (this.consoleLogger) {
            this.logger.log(`${type}: ${message}`);
        } else {
            this.logger.log({
                date: moment().format(),
                level: type,
                message: message
            });
        }
    }
}

module.exports = Logger;
