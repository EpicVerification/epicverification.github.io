// index.js (Your Discord Bot)

// Load environment variables from .env file
require('dotenv').config();

// Import necessary Discord.js classes
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Required for guild-related events (e.g., guildMemberAdd)
        GatewayIntentBits.GuildMembers, // Required to get member data (e.g., roles)
        GatewayIntentBits.GuildMessages, // Required to read messages
        GatewayIntentBits.MessageContent, // Required to access message.content
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember], // Recommended for caching
});

// Get the bot token from environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// --- Bot Configuration (These will eventually come from your dashboard/database) ---
// For now, hardcode them for initial testing.
// Replace with actual IDs from your server for testing!
const VERIFIED_ROLE_ID = 'YOUR_VERIFIED_ROLE_ID_HERE'; // Example: '123456789012345678'
const VERIFICATION_CHANNEL_ID = 'YOUR_VERIFICATION_CHANNEL_ID_HERE'; // Example: '987654321098765432'
const VERIFICATION_MESSAGE_ID = 'YOUR_VERIFICATION_MESSAGE_ID_HERE'; // Example: '112233445566778899'
const VERIFICATION_EMOJI = '✅'; // The emoji users will react with to verify

// --- Bot Ready Event ---
client.once('ready', () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
    client.user.setActivity('for verification', { type: 3 }); // Sets status to "Playing for verification"

    // Set up the verification message in the specified channel
    setupVerificationMessage();
});

async function setupVerificationMessage() {
    try {
        const channel = await client.channels.fetch(VERIFICATION_CHANNEL_ID);
        if (!channel) {
            console.error(`Verification channel with ID ${VERIFICATION_CHANNEL_ID} not found.`);
            return;
        }

        let message;
        try {
            // Try to fetch the existing message
            message = await channel.messages.fetch(VERIFICATION_MESSAGE_ID);
        } catch (error) {
            // If message not found, it will throw an error, so we create a new one
            console.log('Verification message not found, creating a new one.');
        }

        const verificationEmbed = {
            color: 0x7289DA, // Discord blurple color
            title: 'Server Verification',
            description: 'Welcome to the server! To gain access to all channels, please react with the ✅ emoji below.',
            fields: [
                {
                    name: 'How to Verify:',
                    value: `1. Click on the ${VERIFICATION_EMOJI} reaction below this message.\n2. You will automatically be granted the verified role.`,
                },
            ],
            timestamp: new Date(),
            footer: {
                text: 'Powered by YourBotName',
            },
        };

        if (message) {
            // Edit existing message
            await message.edit({ embeds: [verificationEmbed] });
            console.log('Existing verification message updated.');
        } else {
            // Send new message
            const newMessage = await channel.send({ embeds: [verificationEmbed] });
            // Store the new message ID (you'd save this to a database in a real app)
            // VERIFICATION_MESSAGE_ID = newMessage.id; // This line would update a database
            console.log(`New verification message sent with ID: ${newMessage.id}`);
        }
    } catch (error) {
        console.error('Error setting up verification message:', error);
    }
}

// --- Reaction Handling ---
client.on('messageReactionAdd', async (reaction, user) => {
    // If the reaction is not on the verification message, ignore
    if (reaction.message.id !== VERIFICATION_MESSAGE_ID) return;

    // If the user is the bot itself, ignore
    if (user.bot) return;

    // Ensure partials are fetched if the reaction is not fully cached
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    // Check if the reacted emoji is the verification emoji
    if (reaction.emoji.name === VERIFICATION_EMOJI) {
        try {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            const verifiedRole = guild.roles.cache.get(VERIFIED_ROLE_ID);

            if (!verifiedRole) {
                console.error(`Verified role with ID ${VERIFIED_ROLE_ID} not found.`);
                // Optionally remove the user's reaction if role is missing
                await reaction.users.remove(user.id);
                return;
            }

            // Add the verified role to the user
            if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
                await member.roles.add(verifiedRole);
                console.log(`Assigned verified role to ${member.user.tag}`);
            } else {
                console.log(`${member.user.tag} already has the verified role.`);
            }

            // Remove the user's reaction to allow them to re-verify if needed (optional)
            await reaction.users.remove(user.id);

        } catch (error) {
            console.error('Error handling reaction:', error);
        }
    } else {
        // If the reaction is not the correct emoji, remove it
        try {
            await reaction.users.remove(user.id);
        } catch (error) {
            console.error('Error removing incorrect reaction:', error);
        }
    }
});

// --- Login the bot ---
client.login(DISCORD_TOKEN);

// Keep the bot process alive on Replit
// This is a common Replit pattern for web servers, but useful here too
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive!');
}).listen(process.env.PORT || 3001); // Use a different port than the dashboard

