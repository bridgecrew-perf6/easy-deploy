const { readFileSync: getFile } = require("fs");

const { loggers, register } = require("./Include/Logger");

const Server = require("./Include/Server"),
    Queue = require("./Include/Queue");

const queue = new Queue();
register();

function loadConfig() {
    try {
        const Config = JSON.parse(getFile("config.json"));

        return {
            config: Config,
            length: Config.length
        };
    } catch(e) {
        throw e;
    }
}

function deployFiles(server, serverName, filesToDeploy, deployDetails, commands) {
    if (!server)
        return;

    if (filesToDeploy && filesToDeploy.length > 0) {
        loggers.deployer.info("Deploying started into", serverName);
        deployDetails.processing = true;

        for (let index = 0; index < filesToDeploy.length; index++) {
            const file = filesToDeploy[index];

            if (file.clean)
                server.execCommand(`rm -r ${file.target}`);

            server.putDirectory(file.source, file.target).then(re => {
                loggers.deployer.info("Deploying finished, executing commands..");

                for (let index = 0; index < commands.length; index++) {
                    const command = commands[index];

                    if (command)
                        server.execCommand(command).then(r => {
                            if (r.stdout !== "") {
                                const isProcessing = deployDetails.processing || false;

                                if (isProcessing) {
                                    deployDetails.processing = false;
                                    deployDetails.success = true;

                                    loggers.deployer.info("Deployed successfully in", serverName);
                                }
                            }
                        });
                }
            });
        }
    } else {
        loggers.deployer.info("No files to deploy, loggin out");
        server.dispose();

        deployDetails.processing = false;
        deployDetails.success = true;
    }
}

async function deploy(data, deployDetails) {
    if (data) {
        const serverName = data.name,
            screenName = data.screenName,
            serverData = data.server,
            filesToDeploy = data.files,
            commands = data.commands;

        const server = await new Server({
            host: serverData.address,
            user: serverData.user,
            password: serverData.password
        });

        if (server) {
            loggers.deployer.info("Accessed to server", serverName);
            loggers.deployer.info("Killing", serverName, "screen process", "(" + screenName + ")");
            
            server.execCommand(`screen -X -S ${screenName} quit`).then(r => {
                if (r.stdout === "") {
                    deployFiles(server, serverName, filesToDeploy, deployDetails, commands);
                } else {
                    if (r.stdout !== "" || r.stderr !== "")
                        loggers.deployer.trace("Screen session is disabled, continuing deploying files");

                    deployFiles(server, serverName, filesToDeploy, deployDetails, commands);
                }
            });
        }
    }
}

let totalTimeDeployed = 0,
    totalServers = 0;

async function queueRuntime(c) {
    if (queue.isEmpty()) {
        loggers.deployer.info(totalTimeDeployed + "ms total of deployment all files to", totalServers, "servers");

        return process.exit(0);
    } else {
        for (let index = 0; index < queue.elements.length; index++) {
            const queued = queue.elements[index];

            if (queued) {
                let time = Date.now() - queued.now;

                if (queued.processing)
                    loggers.deployer.info("Deploying", queued.name + " - Time remained:", time, "ms");
                else {
                    if (queued.success) {
                        totalTimeDeployed += time;
                        // TODO: reset remaining time
                        // queued.now = Date.now();
                        // time = Date.now() - queued.now;

                        queue.dequeue();

                        if (queue.elements.length > 0) {
                            const d = queue.peek();

                            if (d) {
                                totalServers += 1;

                                await d.deploy(c.config[totalServers - 1], queue.elements[0]);
                            }
                        }
                    }
                }
            }
        }
    }
}

async function init() {
    const c = loadConfig();

    if (c) {
        for (let index = 0; index < c.length; index++) {
            const toDeploy = c.config[index];

            if (toDeploy) {
                loggers.queue.info(`Queued ${toDeploy.name} to deploy`);

                queue.enqueue({
                    name: toDeploy.name,
                    processing: false,
                    now: Date.now(),
                    deploy,
                });
            }
        }
    }

    if (queue) {
        const d = queue.peek();

        if (d) {
            totalServers += 1;

            await d.deploy(c.config[0], queue.elements[0]);
        }

        await queueRuntime(c);
        setInterval(queueRuntime, 1000, c);
    }
}

init(); 