require('dotenv').config()
const Server = require('./models/server')
const cron = require('node-cron');
const { main } = require('./bin/logic');
const { createContextLogger } = require('./components/logger/appLogger');

const logger = createContextLogger('scheduler');

const server = new Server();

server.listen();

// Schedule the cron job to run once a day at midnight
cron.schedule('0 5,19 * * *', async () => {
    logger.info('Running scheduled task...');
    try {
        await main();
        logger.info('Task executed successfully');
    } catch (error) {
        logger.error('Error in the task', { error: error.message, stack: error.stack });
    }
}, {
    timezone: 'America/New_York'
});
