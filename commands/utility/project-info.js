import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

export const data = new SlashCommandBuilder()
  .setName('project-info')
  .setDescription('Display info about a project')
  .addStringOption((op) => {
    return op
      .setName('name')
      .setDescription('The name of the project')
      .setRequired(true);
  });

export async function execute(interaction) {
  const projectName = interaction.options.getString('name');

  try {
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGO_DB_NAME);
    const projects = db.collection('projects');

    const project = await projects.findOne({ name: projectName });

    if (!project) {
      await interaction.reply({
        content: `❌ No project found with the name \`${projectName}\`. Please check the spelling.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`📌 Project: ${project.name}`)
      .setDescription(project.description || 'No description provided.');

    if (project.links) {
      const links = Object.entries(project.links)
        .map(([key, url]) => {
          const icon =
            {
              github: '📁',
              figma: '🎨',
              docs: '📄',
              notion: '🧾',
            }[key.toLowerCase()] || '🔗';
          return `[${icon} ${key}](${url})`;
        })
        .join('\n');
      embed.addFields({ name: '🔗 Links', value: links });
    }

    if (project.teamMembers) {
      let teamStr = '';
      if (Array.isArray(project.teamMembers)) {
        teamStr = project.teamMembers.map((id) => `<@${id}>`).join(', ');
      } else {
        teamStr = Object.entries(project.teamMembers)
          .map(
            ([role, ids]) =>
              `**${role}**: ${ids.map((id) => `<@${id}>`).join(', ')}`,
          )
          .join('\n');
      }
      embed.addFields({ name: '👥 Teams', value: teamStr });
    }

    if (project.techStack) {
      embed.addFields({ name: '🧰 Tech Stack', value: project.techStack });
    }

    if (project.status) {
      embed.addFields({ name: '📅 Status', value: project.status });
    }

    embed.setFooter({ text: 'Project Info | Internal Use Only' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    console.error('❌ Error fetching project:', err);
    await interaction.reply({
      content: '❌ An error occurred while fetching the project information.',
      flags: MessageFlags.Ephemeral,
    });
  } finally {
    await mongoClient.close();
  }
}
