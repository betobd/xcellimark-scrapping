const express = require('express')
const cors = require('cors');
const { createContextLogger } = require('../components/logger/appLogger');

const logger = createContextLogger('server');


// const { dbConnection } = require('../DB/config');

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8080;
        this.paths = {
            webScraping: '/api/webScarping'
        }
        this.middlewares();
        this.routes();
    }

    middlewares() {

        this.app.use(cors());
        this.app.use(express.json());

        this.app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
    }

    routes() {
        this.app.use(this.paths.webScraping, require('../routes/logic'));
    }

    listen() {

        this.app.listen(this.port, () => {
            logger.info('Servidor corriendo', {
                port: this.port,
                url: `http://localhost:${this.port}`,
            });
        });
    }

}

module.exports = Server;
