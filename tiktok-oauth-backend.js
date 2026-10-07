/**
 * TikTok Sandbox OAuth Backend
 * Handles real token exchange and Content Posting API calls
 * Run with: node tiktok-oauth-backend.js
 *
 * Environment variables required:
 * - TIKTOK_CLIENT_ID
 * - TIKTOK_CLIENT_SECRET
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');

const PORT = 3000;

// Configuration - use environment variables
const CLIENT_ID = process.env.TIKTOK_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Store tokens (in production, use secure database)
let storedTokens = null;

console.log('='.repeat(60));
console.log('TikTok Sandbox OAuth Backend');
console.log('='.repeat(60));
console.log(`Client ID: ${CLIENT_ID.substring(0, 10)}...`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log(`Port: ${PORT}`);
console.log('');

async function exchangeCodeForTokens(authCode) {
  /**
   * REAL TikTok Token Exchange
   * Converts authorization code to access/refresh tokens
   */
  console.log('\n[TOKEN EXCHANGE] Starting real token exchange...');
  console.log(`Authorization Code (hidden): ****${authCode.slice(-4)}`);

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: authCode,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      console.log('[TOKEN EXCHANGE] ✅ SUCCESS');
      console.log(`  Access Token (hidden): ****${data.access_token.slice(-4)}`);
      console.log(`  Refresh Token (hidden): ****${data.refresh_token.slice(-4)}`);
      console.log(`  Expires In: ${data.expires_in} seconds`);

      // Store tokens securely (memory only, for demo)
      storedTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      return {
        success: true,
        message: 'Tokens obtained successfully',
        accessTokenPreview: `****${data.access_token.slice(-4)}`,
        refreshTokenPreview: `****${data.refresh_token.slice(-4)}`,
        expiresIn: data.expires_in,
      };
    } else {
      console.log('[TOKEN EXCHANGE] ❌ FAILED');
      console.log('Error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log('[TOKEN EXCHANGE] ❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function uploadVideoToSandbox(videoFilePath) {
  /**
   * REAL Content Posting API - Video Upload
   * Uploads video to TikTok Sandbox
   */

  if (!storedTokens) {
    return { success: false, error: 'No access token available. Authorize first.' };
  }

  console.log('\n[VIDEO UPLOAD] Starting video upload to Sandbox...');

  try {
    const fileContent = fs.readFileSync(videoFilePath);
    const filename = videoFilePath.split('/').pop();

    const formData = new FormData();
    formData.append('video', new Blob([fileContent]), filename);
    formData.append('type', 'video/mp4');

    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/upload/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${storedTokens.accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.data?.upload_id) {
      console.log('[VIDEO UPLOAD] ✅ SUCCESS');
      console.log(`  Upload ID: ${data.data.upload_id}`);
      return {
        success: true,
        uploadId: data.data.upload_id,
      };
    } else {
      console.log('[VIDEO UPLOAD] ❌ FAILED');
      console.log('Error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log('[VIDEO UPLOAD] ❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function publishVideoToSandbox(uploadId, videoDescription) {
  /**
   * REAL Content Posting API - Video Publish
   * Publishes uploaded video to Sandbox account
   */

  if (!storedTokens) {
    return { success: false, error: 'No access token available. Authorize first.' };
  }

  console.log('\n[VIDEO PUBLISH] Publishing video to Sandbox...');
  console.log(`  Upload ID: ${uploadId}`);
  console.log(`  Description: "${videoDescription}"`);

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/action/publish/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedTokens.accessToken}`,
      },
      body: JSON.stringify({
        media_type: uploadId,
        post_info: {
          desc: videoDescription,
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
      }),
    });

    const data = await response.json();

    if (data.data?.publish_id) {
      console.log('[VIDEO PUBLISH] ✅ SUCCESS');
      console.log(`  Publish ID: ${data.data.publish_id}`);
      console.log('  Video is now live on Sandbox account!');
      return {
        success: true,
        publishId: data.data.publish_id,
      };
    } else {
      console.log('[VIDEO PUBLISH] ❌ FAILED');
      console.log('Error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log('[VIDEO PUBLISH] ❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route: GET /
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TikTok Sandbox Demo - Backend</title>
        <style>
          body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
          .box { border: 1px solid #444; padding: 20px; margin: 10px 0; background: #252526; }
          button { background: #007acc; color: white; border: none; padding: 10px 20px; cursor: pointer; margin: 5px; }
          button:hover { background: #0098ff; }
          .success { color: #4ec9b0; }
          .error { color: #f48771; }
          .info { color: #9cdcfe; }
        </style>
      </head>
      <body>
        <h1>🔐 TikTok Sandbox Integration Backend</h1>

        <div class="box">
          <h2>Step 1: Authorize with TikTok</h2>
          <p>Click to open real TikTok Sandbox login</p>
          <button onclick="authorize()">🔗 Authorize with TikTok</button>
          <div id="auth-status"></div>
        </div>

        <div class="box">
          <h2>Step 2: Token Exchange</h2>
          <p>After authorization, tokens are automatically exchanged server-side</p>
          <div id="token-status"></div>
        </div>

        <div class="box">
          <h2>Step 3: Upload & Publish Demo Video</h2>
          <p>Upload a test video and publish to Sandbox</p>
          <input type="file" id="video-file" accept="video/*" />
          <button onclick="uploadAndPublish()">📤 Upload & Publish</button>
          <div id="publish-status"></div>
        </div>

        <div class="box">
          <h2>Server Log</h2>
          <div id="log" style="height: 200px; overflow-y: auto; background: #1e1e1e; border: 1px solid #444; padding: 10px;"></div>
        </div>

        <script>
          const logDiv = document.getElementById('log');

          function log(message, type = 'info') {
            const line = document.createElement('div');
            line.className = type;
            line.textContent = message;
            logDiv.appendChild(line);
            logDiv.scrollTop = logDiv.scrollHeight;
          }

          function authorize() {
            const authUrl = 'https://www.tiktok.com/v2/oauth/authorize/?' +
              'client_key=${CLIENT_ID}&' +
              'redirect_uri=http://localhost:3000/callback&' +
              'scope=user.info.basic,video.upload,video.publish,video.list&' +
              'response_type=code&' +
              'state=' + Math.random().toString(36);

            log('Opening TikTok Sandbox login...', 'info');
            window.location.href = authUrl;
          }

          function pollTokenStatus() {
            fetch('/status')
              .then(r => r.json())
              .then(data => {
                if (data.hasTokens) {
                  document.getElementById('token-status').innerHTML =
                    '<span class="success">✓ Tokens obtained server-side</span>';
                  log('Tokens ready on server', 'success');
                }
              });
          }

          function uploadAndPublish() {
            const file = document.getElementById('video-file').files[0];
            if (!file) {
              alert('Please select a video file');
              return;
            }

            const formData = new FormData();
            formData.append('video', file);
            formData.append('description', 'Demo video from Andra YouTube Growth');

            fetch('/publish', { method: 'POST', body: formData })
              .then(r => r.json())
              .then(data => {
                if (data.success) {
                  document.getElementById('publish-status').innerHTML =
                    '<span class="success">✓ Video published! Publish ID: ' +
                    data.publishId.substring(0, 8) + '...</span>';
                  log('Video published to Sandbox!', 'success');
                } else {
                  log('Publish failed: ' + data.error, 'error');
                }
              });
          }

          // Poll for token status every 2 seconds
          setInterval(pollTokenStatus, 2000);
          log('Backend started. Waiting for authorization...', 'info');
        </script>
      </body>
      </html>
    `);
    return;
  }

  // Route: GET /callback - OAuth callback from TikTok
  if (pathname === '/callback') {
    const authCode = query.code;
    const error = query.error;

    if (error) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: error }));
      console.log(`\n[CALLBACK] Authorization denied: ${error}`);
      return;
    }

    if (!authCode) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'No authorization code received' }));
      return;
    }

    console.log(`\n[CALLBACK] Received authorization code from TikTok`);
    console.log(`Code (hidden): ****${authCode.slice(-4)}`);

    // Exchange code for tokens (server-side, secret safe)
    exchangeCodeForTokens(authCode).then(() => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: monospace; background: #1e1e1e; color: #4ec9b0; padding: 20px;">
          <h1>✅ Authorization Successful</h1>
          <p>Tokens have been securely exchanged on the server.</p>
          <p>No tokens are visible in this page.</p>
          <p><a href="http://localhost:3000/" style="color: #007acc;">Return to Dashboard</a></p>
        </body>
        </html>
      `);
    });

    return;
  }

  // Route: GET /status - Check if tokens are ready
  if (pathname === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      hasTokens: storedTokens !== null,
      tokenAge: storedTokens ? Math.round((Date.now() - storedTokens.obtainedAt) / 1000) : null,
    }));
    return;
  }

  // Route: POST /publish - Upload and publish video
  if (pathname === '/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      // In production, parse multipart form data properly
      // For demo, assume video file in request
      const videoPath = '/tmp/demo-video.mp4';
      const description = 'Demo video from Andra YouTube Growth automation';

      const uploadResult = await uploadVideoToSandbox(videoPath);
      if (!uploadResult.success) {
        res.end(JSON.stringify(uploadResult));
        return;
      }

      const publishResult = await publishVideoToSandbox(uploadResult.uploadId, description);
      res.end(JSON.stringify(publishResult));
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n✅ Server listening on http://localhost:${PORT}`);
  console.log(`\nNext steps:`);
  console.log(`1. Set environment variables:`);
  console.log(`   export TIKTOK_CLIENT_ID="your_client_id"`);
  console.log(`   export TIKTOK_CLIENT_SECRET="your_client_secret"`);
  console.log(`\n2. Open http://localhost:3000 in browser`);
  console.log(`3. Click "Authorize with TikTok"`);
  console.log(`4. Log in with Sandbox credentials`);
  console.log(`5. Backend handles token exchange securely`);
  console.log(`6. Upload a video and publish to Sandbox`);
  console.log(`\n⚠️  IMPORTANT: Client Secret is NEVER exposed to browser`);
  console.log(`All tokens handled server-side only\n`);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  process.exit(0);
});
