import { ActivityType } from 'discord.js';

export default {
    name: 'ready',
    once: true,
    async execute(message, client, Discord) {
        console.log('Client is online!');
        console.timeEnd('Time to online');

        // Set client activity
        client.user.setActivity({ type: ActivityType.Custom, name: 'custom', state: 'DM for staff support' });
    }
};