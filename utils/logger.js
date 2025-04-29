// utils/logger.js

const { Logging } = require('@google-cloud/logging');

// Create a client
const logging = new Logging();

// Choose a log name (it will appear in Cloud Console)
const log = logging.log('picplate-backend-logs');

// Create a helper function
async function logToCloud(payload) {
    const metadata = { resource: { type: 'global' } };
    const entry = log.entry(metadata, payload);
    try {
        await log.write(entry);
        console.log('✅ Logged to Google Cloud:', payload);
    } catch (err) {
        console.error('❌ Failed to log to Google Cloud:', err);
    }
}

// Export it so it can be used elsewhere
module.exports = { logToCloud };
