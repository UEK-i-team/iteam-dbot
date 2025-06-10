module.exports = {
    name: 'doorStatusChange',
    async execute(client, status) {
        try {
            const doorChannelId = process.env.DOOR_CHANNEL_ID;

            if (!doorChannelId) {
                return console.error('Door channel ID is not configured');
            }

            const channel = await client.channels.fetch(doorChannelId);
            if (!channel) {
                return console.error('Door channel not found');
            }

            if (status === 'open') {
                await channel.setName('kto-w-432-otwarty');
                await channel.send('Pokój koła jest otwarty');
            }
            else if (status === 'closed') {
                await channel.setName('kto-w-432-zamkniety');
                await channel.send('Pokój koła jest zamknięty');
            }

            console.log(`Door status changed to: ${status}`);
        }
        catch (error) {
            console.error('Error handling door status change:', error);
        }
    },
};