const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { MessageFlags } = require('discord-api-types/v10');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('project-set-data')
		.setDescription('Set the project data for the current channel')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('The channel ID to set the project data for')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('notion')
				.setDescription('The Notion link for the project')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('figma')
				.setDescription('The Figma link for the project')
				.setRequired(false))
		.addStringOption(option =>
			option.setName('github')
				.setDescription('The GitHub link for the project')
				.setRequired(false)),

	async execute(interaction) {
		if (!interaction.member.permissions.has('ADMINISTRATOR')) {
			return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
		}
		const filePath = './data/channels.json';
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, '{}', 'utf8');
		}
		const jsonFile = await JSON.parse(fs.readFileSync(filePath, 'utf8'));
		const channelId = interaction.options.getChannel('channel').id;
		const notionLink = interaction.options.getString('notion');
		const figmaLink = interaction.options.getString('figma');
		const githubLink = interaction.options.getString('github');
		if (!jsonFile[channelId]) {
			jsonFile[channelId] = {
				notion: notionLink || '',
				figma: figmaLink || '',
				github: githubLink || '',
			};
		}
		fs.writeFileSync(filePath, JSON.stringify(jsonFile, null, 2), 'utf8');

		await interaction.reply({ content: `updated data: Project data for channel <#${channelId}> has been updated.`,
			flags: MessageFlags.Ephemeral,
		});
	},
};