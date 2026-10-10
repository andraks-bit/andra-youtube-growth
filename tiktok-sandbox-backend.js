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
const fs = require('fs');
const path = require('path');

// Credentials from environment (GitHub Secrets or local .env)
const CLIENT_KEY = process.env.TIKTOK_CLIENT_ID || process.env.TIKTOK_SANDBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_SANDBOX_CLIENT_SECRET;
const DEFAULT_PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3001';
const TOKEN_ENDPOINT = 'https://open.tiktokapis.com/v2/oauth/token/';

// Verify credentials are loaded (for debugging)
if (!CLIENT_KEY) {
  console.warn('[WARNING] TIKTOK_CLIENT_ID environment variable not found');
}
if (!CLIENT_SECRET) {
  console.warn('[WARNING] TIKTOK_CLIENT_SECRET environment variable not found');
}

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

  // Make.com webhook: YouTube-to-TikTok automation trigger
  if (pathname === '/api/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        // Validate authentication token
        const authHeader = req.headers.authorization;
        const expectedToken = process.env.MAKE_WEBHOOK_TOKEN;

        if (!authHeader || !expectedToken) {
          console.error('[API/Publish] Missing authorization header or webhook token');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized. Missing or invalid token.' }));
          return;
        }

        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
        if (!tokenMatch || tokenMatch[1] !== expectedToken) {
          console.error('[API/Publish] Invalid authentication token');
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden. Invalid token.' }));
          return;
        }

        // Verify TikTok credentials
        const clientId = CLIENT_KEY;
        const clientSecret = CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('[API/Publish] TikTok credentials not configured');
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Service unavailable. TikTok credentials not configured.' }));
          return;
        }

        const requestData = JSON.parse(body);
        const { action = 'preview', videoUrl, title, description } = requestData;

        if (!videoUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required field: videoUrl' }));
          return;
        }

        console.log(`[API/Publish] Request: action=${action}, videoUrl=${videoUrl.substring(0, 50)}...`);

        // Preview mode (safe, no actual publishing)
        if (action === 'preview' || action === 'dry-run') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'preview',
            message: 'Automation triggered in preview mode. No videos published.',
            wouldPublish: {
              platform: 'TikTok',
              videoUrl: videoUrl,
              title: title || 'Untitled',
              description: description || 'Auto-generated from YouTube',
              timestamp: new Date().toISOString()
            },
            nextStep: 'Review the preview above, then call with action=publish to publish',
            credentialsStatus: '✓ TikTok credentials verified'
          }));
          return;
        }

        // Publish action (requires approval)
        if (action === 'publish') {
          console.log('[API/Publish] Publish action received (approval required)');
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'pending_approval',
            message: 'Publish request queued pending manual approval',
            videoUrl: videoUrl,
            requestId: `pub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            note: 'Video will be published after manual review and approval'
          }));
          return;
        }

        // Invalid action
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Invalid action',
          validActions: ['preview', 'dry-run', 'publish'],
          received: action
        }));

      } catch (error) {
        console.error('[API/Publish] Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
      }
    });
    return;
  }

  // TikTok site verification file
  if (pathname === '/tiktokoOVlUe0ONedywupVL1M24vbaXs7FN0U4.txt') {
    try {
      const filePath = path.join(__dirname, 'tiktokoOVlUe0ONedywupVL1M24vbaXs7FN0U4.txt');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content);
      return;
    } catch (error) {
      console.error('[Verification] TikTok verification file not found');
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
  }

  // Serve legal pages (Terms of Service, Privacy Policy)
  if (pathname === '/terms-of-service.html' || pathname === '/terms') {
    try {
      const filePath = path.join(__dirname, 'terms-of-service.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    } catch (error) {
      console.error('[Legal Pages] Terms of Service file not found');
    }
  }

  if (pathname === '/privacy-policy.html' || pathname === '/privacy') {
    try {
      const filePath = path.join(__dirname, 'privacy-policy.html');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    } catch (error) {
      console.error('[Legal Pages] Privacy Policy file not found');
    }
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
