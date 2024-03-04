import { BaseChannel } from "discord.js";

export default {
    name: `channelDelete`,
    /**
     * @param {BaseChannel} channel
     */
    async execute(channel, client) {
        // Notify the user when their support channel is closed
        if (channel.name.includes('ticket')) {
            const dmChannel = await client.channels.fetch(channel.topic)
                .catch(err => { return console.error(`There was a problem fetching a support DM: `, err) });

            dmChannel.send({
                content: `## Your support ticket has been closed!`
            }).catch(err => { return console.error(`There was a problem sending a follow-up support message: `, err) });
        }
    }
};