const express = require('express');
const crypto = require('crypto');

const webhookPort = process.env.WEBHOOK_PORT;
const webhookSecret = process.env.WEBHOOK_SECRET;
const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;

class GitHubWebhookHandler {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use('/webhook', (req, res, next) => {
            let data = '';
            req.setEncoding('utf8');
            
            req.on('data', chunk => {
                data += chunk;
            });
            
            req.on('end', () => {
                req.rawBody = data;
                req.body = Buffer.from(data, 'utf8');
                next();
            });
        });
    }

    setupRoutes() {
        this.app.post('/webhook', (req, res) => {
            const signature = req.headers['x-hub-signature-256'];
            const payload = req.body;

            if (!this.verifySignature(payload, signature)) {
                return res.status(401).send('Unauthorized');
            }

            try {
                let event;
                const payloadString = payload.toString();
                
                if (payloadString.startsWith('payload=')) {
                    const urlEncodedPayload = payloadString.substring(8);
                    const decodedPayload = decodeURIComponent(urlEncodedPayload);
                    event = JSON.parse(decodedPayload);
                } else {
                    event = JSON.parse(payloadString);
                }
                
                this.handleWebhookEvent(event, req.headers['x-github-event']);
                res.status(200).send('OK');
            } catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'OK', message: 'Webhook server is running' });
        });
    }

    verifySignature(payload, signature) {
        if (!webhookSecret || !signature || !payload) {
            return false;
        }

        try {
            const hmac = crypto.createHmac('sha256', webhookSecret);
            const digest = 'sha256=' + hmac.update(payload).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }

    async handleWebhookEvent(event, eventType) {
        if (eventType === 'push') {
            await this.handlePushEvent(event);
        }
    }

    async handlePushEvent(event) {
        const branch = event.ref.replace('refs/heads/', '');
        const repositoryName = event.repository.name;
        const commits = event.commits || [];

        if (branch === 'main' || branch === 'develop') {
            const message = this.createSimpleNotification(repositoryName, commits);
            await this.sendDiscordNotification(message);
        }
    }

    createSimpleNotification(repositoryName, commits) {
        const commitMessage = commits[0]?.message || 'No commit message';
        const cleanMessage = commitMessage.replace(/\+/g, ' ');
        
        let message = `🚀 **New Deployment to \`${repositoryName}\`!**\n`;
        message += `✨ **Commit:** \`${cleanMessage}\`\n`;
        return message;
    }

    async sendDiscordNotification(message) {
        try {
            const channel = await this.client.channels.fetch(notificationChannelId);
            if (channel) {
                await channel.send(message);
                console.log('Discord notification sent successfully');
            } else {
                console.error('Discord channel not found');
            }
        } catch (error) {
            console.error('Error sending Discord notification:', error);
        }
    }

    start() {
        this.server = this.app.listen(webhookPort, () => {
            console.log(`GitHub webhook server running on port ${webhookPort}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('Webhook server stopped');
        }
    }
}

module.exports = GitHubWebhookHandler;
