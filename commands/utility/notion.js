const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { MessageFlags } = require('discord-api-types/v10');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('notion')
		.setDescription('Get the Notion link for the current project'),
	async execute(interaction) {
		const filePath = './data/channels.json';
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, '{}', 'utf8');
		}
		const file = fs.readFileSync(filePath, 'utf8');
		const channels = JSON.parse(file);

		const notionLink = channels[interaction.channel.id]?.notion;
		await interaction.reply({
			content: notionLink || 'No Notion link found for this channel. Please set it using `/project-set-data` command.',
			flags: MessageFlags.Ephemeral,
		});
	},
};