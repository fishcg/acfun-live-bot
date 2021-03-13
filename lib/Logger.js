const path = require("path");
const winston = require("winston");
require('winston-daily-rotate-file');

const { LOG_PATH, ENV } = require("../config/system");

const { createLogger, format, transports } = winston;
const { combine, timestamp, colorize, printf } = format;

const datePattern = "YYYY_MM_DD";
const dirname = path.join(LOG_PATH, "%DATE%");

const myFormat = printf(info => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
});

const errorFilter = format((info, opts) => {
    return info.level === 'error' ? info : false
});

const warnFilter = format((info, opts) => {
    return info.level === 'warn' ? info : false
});

const infoFilter = format((info, opts) => {
    return info.level === 'info' ? info : false
});

let logger;
if ("prod" === ENV) {
    const exceptionHandlers = [
        new transports.DailyRotateFile({
            datePattern: datePattern,
            dirname: dirname,
            filename: "exception.log",
            zippedArchive: true,
            maxFiles: '14d',
            format: combine(
                timestamp(),
                myFormat
            ),
        }),
    ]
    
    const transports_conf =  [
        new transports.DailyRotateFile({
            level: "info",
            datePattern: datePattern,
            dirname: dirname,
            filename: "info.log",
            zippedArchive: true,
            maxFiles: '14d',
            format: combine(
                infoFilter(),
                timestamp(),
                myFormat
            ),
        }),
        new transports.DailyRotateFile({
            level: 'warn',
            datePattern: datePattern,
            dirname: dirname,
            filename: 'waring.log',
            zippedArchive: true,
            maxFiles: '14d',
            format: combine(
                warnFilter(),
                timestamp(),
                myFormat
            ),
        }),
        new transports.DailyRotateFile({
            level: "error",
            datePattern: datePattern,
            dirname: dirname,
            filename: "error.log",
            zippedArchive: true,
            maxFiles: '14d',
            format: combine(
                errorFilter(),
                timestamp(),
                myFormat
            ),
        }),
    ];
    
    logger = createLogger({
        transports: transports_conf,
        exitOnError: false,
        exceptionHandlers: exceptionHandlers
    });
} else {
    logger = createLogger({
        transports: [new transports.Console({
            level: "silly",
            format: combine(
                colorize(),
                timestamp(),
                myFormat
            )
        })]
    });
}

module.exports = logger
