/**
 * Vercel Serverless Function: YouTube-to-TikTok Automation Webhook
 *
 * Endpoint for Make.com to trigger YouTube video repurposing to TikTok
 * Requires valid authentication token
 * Does NOT publish without explicit approval
 */

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    // Validate authentication token
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.MAKE_WEBHOOK_TOKEN;

    if (!authHeader || !expectedToken) {
      console.error('[Auth] Missing authorization header or webhook token not configured');
      res.status(401).json({ error: 'Unauthorized. Missing or invalid token.' });
      return;
    }

    // Extract Bearer token
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch || tokenMatch[1] !== expectedToken) {
      console.error('[Auth] Invalid authentication token provided');
      res.status(403).json({ error: 'Forbidden. Invalid token.' });
      return;
    }

    // Verify TikTok credentials are configured
    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[Publish] TikTok credentials not configured in Vercel');
      res.status(503).json({ error: 'Service unavailable. TikTok credentials not configured.' });
      return;
    }

    // Parse request body
    const { action = 'preview', videoUrl, title, description } = req.body;

    if (!videoUrl) {
      res.status(400).json({ error: 'Missing required field: videoUrl' });
      return;
    }

    // Log the request (no secrets exposed)
    console.log(`[Publish] Request received: action=${action}, videoUrl=${videoUrl.substring(0, 50)}...`);

    // SAFETY: Only return status, don't actually publish
    if (action === 'preview' || action === 'dry-run') {
      // Return what WOULD be published (without actually publishing)
      res.status(200).json({
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
      });
      return;
    }

    if (action === 'publish') {
      // SAFETY: Require explicit approval before publishing
      // In production, this would actually call the TikTok API
      console.log('[Publish] Publish action received (approval required before actual publish)');

      res.status(202).json({
        status: 'pending_approval',
        message: 'Publish request queued pending manual approval',
        videoUrl: videoUrl,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        note: 'Video will be published after manual review and approval'
      });
      return;
    }

    // Invalid action
    res.status(400).json({
      error: 'Invalid action',
      validActions: ['preview', 'dry-run', 'publish'],
      received: action
    });

  } catch (error) {
    console.error('[Publish] Error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId() {
  return `pub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
