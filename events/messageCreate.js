import { Message, ChannelType, PermissionFlagsBits } from 'discord.js';

let lastSupportAlert = 0;

export default {
    name: `messageCreate`,
    /**
     * @param {Message} message
     */
    async execute(message, client) {
        const { member, author, channel, content } = message;
        const guild = client.guilds.cache.get(process.env.GUILD_ID);

        // Ignore all bot messages
        if (author.bot) return;

        // Listen for DM messages
        if (channel.type === ChannelType.DM) {
            // Check if a user already has an active support channel
            const activeSupportChan = guild.channels.cache.filter(channel => channel.name.includes(author.id)).first();

            if (!activeSupportChan || activeSupportChan?.size === 0) {
                // Send confirmation message to the user
                await channel.send({
                    content: `## Your support ticket has been created! \n*Please be patient while staff get around to viewing your ticket. In the mean time, be sure to provide any additional text or images related to your ticket*`
                }).catch(err => { return console.error(`There was a problem sending confirmation support message: `, err) });

                // Create unique support channel
                const supportChan = await guild.channels.create({
                    name: `${author.id}-ticket`,
                    topic: channel.id,
                    permissionOverwrites: [{
                        id: guild.id,
                        deny: PermissionFlagsBits.ViewChannel
                    },
                    {
                        id: client.user.id,
                        allow: PermissionFlagsBits.ViewChannel
                    }]
                }).catch(err => { return console.error(` There was a problem creating a support channel: `, err) });

                // Send initial support message
                await supportChan.send({
                    content: `## Support chat between <@&${process.env.STAFF_ROLE_ID}> and <@${author.id}>`,
                }).catch(err => { return console.error(`There was a problem sending initial support message: `, err) });

                // Send support message with content
                await supportChan.send({
                    content: `<@${author.id}>: ${content}`,
                    files: message.attachments.first() ? [message.attachments.first().url] : []
                }).catch(err => { return console.error(`There was a problem sending OP content support message: `, err) });
            } else {
                // Send follow-up message to existing support channel
                await activeSupportChan.send({
                    content: `<@${author.id}>: ${content}`,
                    files: message.attachments.first() ? [message.attachments.first().url] : []
                }).catch(err => { return console.error(`There was a problem sending OP support message: `, err) });
            }
        }

        // Allow staff to chat directly to the user through the bot's DMs
        if (channel.type === ChannelType.GuildText && channel.name.includes('ticket') && member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
            const dmChannel = await client.channels.fetch(channel.topic)
                .catch(err => { return console.error(`There was a problem fetching a support DM: `, err) });

            // Send followup messages to the user
            dmChannel.send({
                content: `<@${member.id}>: ${content}`,
                files: message.attachments.first() ? [message.attachments.first().url] : []
            }).catch(err => { return console.error(`There was a problem sending a follow-up support message: `, err) });
        }

        // Reply to messages that appear to be concerning a need for staff support
        if (channel.type === ChannelType.GuildText) {
            const now = Date.now();
            const cooldownPeriod = 15 * 60 * 1000;

            // Prevent the message being sent more than once every 15 minutes
            if (now - lastSupportAlert < cooldownPeriod) return;

            const supportKeywords = {
                high: [
                    { word: 'report', weight: 3 },
                    { word: 'staff', weight: 3 },
                    { word: 'contact', weight: 3 }
                ],
                medium: [
                    { word: /\bspam\w*|\bspam\b/i, weight: 2 },
                    { word: /\bscam\w*|\bscam\b/i, weight: 2 },
                    { word: /\imperson\w+/i, weight: 2 },
                ],
                low: [
                    { word: 'need', weight: 1 },
                    { word: 'help', weight: 1 },
                    { word: 'how', weight: 1 },
                    { word: 'rules', weight: 1 }
                ]
            };

            let score = 0;
            const threshold = 4;

            const messageWords = message.content
                .toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .split(' ')

            for (const weightLevel in supportKeywords) {
                for (const keywordData of supportKeywords[weightLevel]) {
                    if (typeof keywordData.word === "string" && messageWords.includes(keywordData.word.toLowerCase())) {
                        score += keywordData.weight;
                    } else if (keywordData.word instanceof RegExp && keywordData.word.test(message.content.toLowerCase())) {
                        score += keywordData.weight;
                    }
                }
            }

            if (messageWords.includes(`not`) || messageWords.includes(`don't`)) score = 0;

            if (score >= threshold) {
                const infoMessage = await message?.reply({
                    content: `Hi, \n\nBased on your message it looks like you need help contacting server staff \nYou can contact them directly by sending me a direct message, and a staff member will get back to you as soon as they can \n\n*To send me a direct message, **right-click my username > message***`
                }).catch(err => { return console.error(`There was a problem replying to a potential support request: `, err) });

                // TEMPORARY: Log message content to check for bad flags
                console.log(`Replied to potential support request message - "${content}"`);

                setTimeout(() => {
                    infoMessage.delete().catch(err => { return console.error(`There was a problem deleting a support info message: `, err) });
                }, 45000);

                lastSupportAlert = now;
            }
        }
    }
};