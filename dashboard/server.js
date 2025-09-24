// server.js (or app.js) for your dashboard backend

// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const fetch = require('node-fetch'); // For making HTTP requests to Discord API
const path = require('path'); // For serving static files

// Initialize Express app
const app = express();
// Use process.env.PORT as suggested by Replit support, or default to 3000
const PORT = process.env.PORT || 3000; 

// --- Discord OAuth2 Configuration ---
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DASHBOARD_REDIRECT_URI; // This MUST match the URI in Discord Developer Portal

// Discord API Endpoints
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const OAUTH_AUTHORIZE_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds`;
// 'identify' scope: allows fetching user's ID and basic profile (username, avatar)
// 'guilds' scope: allows fetching a list of guilds the user is in and their permissions

// --- Serve Static Files ---
// This tells Express to serve your HTML, CSS, JS files from the 'public' directory.
// You should place your index.html, login.html, dashboard.html, etc., inside a folder named 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Route to initiate Discord OAuth2 login
app.get('/auth/discord', (req, res) => {
    // Redirect the user to Discord's authorization page
    res.redirect(OAUTH_AUTHORIZE_URL);
});

// Callback route after Discord authorizes the user
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code; // Get the authorization code from Discord's redirect

    if (!code) {
        // If no code is present, it means the user denied authorization or an error occurred
        console.error('No code provided in Discord OAuth callback.');
        return res.status(400).send('Authorization failed: No code received.');
    }

    try {
        // Exchange the authorization code for an access token
        const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                scope: 'identify guilds', // Must match the scope used in the authorize URL
            }).toString(),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Error exchanging code for token:', tokenResponse.status, errorText);
            return res.status(tokenResponse.status).send(`Failed to get access token: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        // const refreshToken = tokenData.refresh_token; // Store this for long-term sessions

        // --- At this point, the user is authenticated ---
        // You can now use the accessToken to fetch user data and guild data from Discord API
        // For simplicity, we'll just redirect to the dashboard for now.
        // In a real application, you would:
        // 1. Store the user's Discord ID and access token in a session (e.g., using express-session).
        // 2. Fetch user details (e.g., username, avatar) to display on the dashboard.
        // 3. Fetch guilds the user manages to populate the server selection dropdown.

        console.log('Successfully obtained access token for user.');

        // Redirect to your dashboard page.
        // In a real app, you might pass a session ID or user data here.
        res.redirect('/dashboard.html'); // Assuming your dashboard HTML file is named dashboard.html
                                        // and is located in the 'public' folder.

    } catch (error) {
        console.error('Error during Discord OAuth2 callback:', error);
        res.status(500).send('An internal server error occurred during authentication.');
    }
});

// --- Start the Server ---
// Modified to listen on process.env.PORT and '0.0.0.0' as per Replit support's guidance
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dashboard backend server running on port ${PORT}`);
    console.log(`Make sure your Discord Redirect URI is set to: ${REDIRECT_URI}`);
});
