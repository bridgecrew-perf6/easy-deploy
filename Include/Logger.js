const chalk = require("chalk"),
    log4js = require("log4js");

const loggers = {
    queue: log4js.getLogger("Queue"),
    deployer: log4js.getLogger("Deployer")
};

module.exports = {
    loggers,
    register: () => {
        return log4js.configure(
            {
                appenders: {
                    console: {
                        type: "console",
                        layout: {
                            type: "pattern",
                            pattern: `%[[%d{hh:mm:ss}] [%p/${chalk.bold("%c")}]%]: %m`
                        }
                    },
                    file: {
                        type: "file",
                        filename: "logs/server.log",
                        pattern: "yyyy-MM-dd_hh",
                        maxLogSize: 1024 * 1024 * 1024 * 8,
                        backups: 2048,
                        compress: true,
                        keepFileExt: true,
                        layout: {
                            type: "pattern",
                            pattern: `%[[%d{hh:mm:ss}] [%p/${chalk.bold("%c")}]%]: %m`
                        }
                    }
                },
                categories: {
                    default: {
                        appenders: [
                            "console",
                            "file"
                        ],
                        level: "all"
                    }
                }
            }
        );
    }
}
