const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const http = require('http');
require('dotenv').config();
const token = process.env.TOKEN;
const doorApiKey = process.env.DOOR_API_KEY;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

const server = http.createServer((req, res) => {
	if (req.method === 'POST' && req.url === '/door-status') {
		let data = '';

		req.on('data', chunk => {
			data += chunk;
		});

		req.on('end', () => {
			try {
				const payload = JSON.parse(data);

				// Validate API key
				if (payload.apiKey !== doorApiKey) {
					console.error('Invalid API key received');
					res.writeHead(401);
					res.end('Unauthorized');
					return;
				}

				// Check for valid status
				if (payload.newStatus !== 'open' && payload.newStatus !== 'close') {
					console.error('Invalid status received:', payload.newStatus);
					res.writeHead(400);
					res.end('Invalid status');
					return;
				}

				// Trigger the door status change event
				const doorStatusChangeEvent = require('./events/doorStatusChange');
				doorStatusChangeEvent.execute(client, payload.newStatus);

				res.writeHead(200);
				res.end('Status updated');
			}
			catch (error) {
				console.error('Error processing request:', error);
				res.writeHead(400);
				res.end('Invalid request');
			}
		});
	}
	else {
		res.writeHead(404);
		res.end('Not found');
	}
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

client.login(token);