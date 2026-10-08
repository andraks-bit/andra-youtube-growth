#!/usr/bin/env node

/**
 * TikTok Sandbox Secure Backend
 *
 * Handles OAuth callback securely on behalf of GitHub Pages frontend.
 * Client Secret never exposed - kept server-side only.
 * Authorization code exchanged immediately, never stored.
 */

const http = require('http');
const url = require('url');
const https = require('https');
const querystring = require('querystring');

// Credentials from environment (GitHub Secrets or local .env)
const CLIENT_KEY = process.env.TIKTOK_CLIENT_ID || process.env.TIKTOK_SANDBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_SANDBOX_CLIENT_SECRET;
const DEFAULT_PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3001';
const TOKEN_ENDPOINT = 'https://open.tiktokapis.com/v2/oauth/token/';

// Function to get public URL from request or environment
function getPublicURL(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;

  // Auto-detect from request headers (for Railway, Heroku, etc)
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  if (host && host !== 'localhost:3001') {
    return `${protocol}://${host}`;
  }

  return DEFAULT_PUBLIC_URL;
}

// In-memory storage for demo session (cleared on restart)
let sessionState = {
  accessToken: null,
  userInfo: null,
  uploadId: null,
  publishId: null,
  error: null
};

/**
 * Exchange authorization code for access token
 * This happens SECURELY on the backend - client never sees the flow
 */
async function exchangeCodeForToken(code, verifier) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      client_id: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      code_verifier: verifier
    });

    const options = {
      hostname: 'open.tiktokapis.com',
      path: '/v2/oauth/token/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response);
          } else {
            reject(new Error(response.error_description || 'Token exchange failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Get user info using access token
 */
async function getUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'open.tiktokapis.com',
      path: '/v2/user/info/',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.data) {
            resolve(response.data);
          } else {
            reject(new Error('Failed to get user info'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Enable CORS for GitHub Pages frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health') {
    const publicUrl = getPublicURL(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      credentials: !!(CLIENT_KEY && CLIENT_SECRET),
      client_key: CLIENT_KEY || null,
      public_url: publicUrl
    }));
    return;
  }

  // OAuth callback from TikTok
  if (pathname === '/callback') {
    const publicUrl = getPublicURL(req);
    const code = query.code;
    const state = query.state;
    const error = query.error;

    console.log(`[Callback] Code: ${code ? code.substring(0, 10) + '...' : 'none'}, Error: ${error || 'none'}`);
    console.log(`[Callback] Public URL: ${publicUrl}`);

    if (error) {
      sessionState.error = error;
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error, error_description: query.error_description }));
      return;
    }

    if (!code) {
      sessionState.error = 'No authorization code';
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no_code' }));
      return;
    }

    try {
      // Exchange code for token (SECURE - happens here, not in browser)
      const tokenResponse = await exchangeCodeForToken(code, sessionState.codeVerifier);
      const accessToken = tokenResponse.access_token;

      console.log(`[Token] Received: ${accessToken.substring(0, 10)}...`);

      // Get user info
      const userInfo = await getUserInfo(accessToken);
      console.log(`[User] ID: ${userInfo.open_id}, Name: ${userInfo.display_name}`);

      // Store in session (frontend will poll this)
      sessionState.accessToken = accessToken;
      sessionState.refreshToken = tokenResponse.refresh_token;
      sessionState.userInfo = userInfo;
      sessionState.error = null;

      // Redirect back to frontend with success
      res.writeHead(302, { 'Location': `http://localhost:3000?success=true&user=${encodeURIComponent(userInfo.display_name)}` });
      res.end();
      return;

    } catch (err) {
      console.error('[Error]', err.message);
      sessionState.error = err.message;
      res.writeHead(302, { 'Location': `http://localhost:3000?error=${encodeURIComponent(err.message)}` });
      res.end();
      return;
    }
  }

  // Frontend queries session state
  if (pathname === '/session') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      authenticated: !!sessionState.accessToken,
      user: sessionState.userInfo,
      error: sessionState.error
    }));
    return;
  }

  // Frontend sets PKCE verifier before starting OAuth
  if (pathname === '/set-verifier' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        sessionState.codeVerifier = data.verifier;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TikTok Sandbox Secure Backend Running`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\nPublic URL: ${publicUrl}`);
  console.log(`Local Port: ${PORT}`);
  console.log(`OAuth Callback: ${publicUrl}/callback`);
  console.log(`\nCredentials: ${CLIENT_KEY && CLIENT_SECRET ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Client Key: ${CLIENT_KEY ? '✓ Available' : '✗ Missing'}`);
  console.log(`\nThis backend handles OAuth callback securely.`);
  console.log(`Client Secret never exposed to browser or logs.\n`);
});
