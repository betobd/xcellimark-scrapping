require('dotenv').config()
const Server = require('./models/server')
const cron = require('node-cron');
const { main } = require('./bin/logic');

const server = new Server();

server.listen();

// Schedule the cron job to run once a day at midnight
cron.schedule('0 5,19 * * *', async () => {
    console.log('⏳ Running scheduled task...');
    try {
        await main();
        console.log('✅ Task executed successfully');
    } catch (error) {
        console.error('❌ Error in the task:', error);
    }
}, {
    timezone: 'America/New_York'
});