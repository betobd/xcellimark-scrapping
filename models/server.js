const express = require('express')
const cors = require('cors');


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

            console.log('Servidor corriendo en el puerto', this.port, 'access here: http://localhost:8080');
        });
    }

}

module.exports = Server;