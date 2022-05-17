const { NodeSSH: SSH } = require("node-ssh");

class Server extends SSH {
    constructor(data) {
        super();

        if (!this.connection)
            return this.connect({
                host: data.host,
                username: data.user,
                password: data.password
            });
    }
}

module.exports = Server;