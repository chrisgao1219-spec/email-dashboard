// Gmail OAuth 回调 — 处理授权 code，换取并保存 refresh_token
// redirect URI 目标：/api/auth/google/callback

import { kv } from '@vercel/kv';

const KV_KEY = 'gmail_refresh_token';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(302).setHeader('Location', '/?gmail=error').end();
  }

  if (!code) {
    return res.status(400).send('缺少授权 code');
  }

  // redirect_uri 必须与发起授权时一致
  const host = req.headers.host || '';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  try {
    // 用 code 换 access_token + refresh_token
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      return res.status(500).send('授权失败: ' + (tokenData.error_description || tokenData.error || tokenResp.status));
    }

    const refreshToken = tokenData.refresh_token;
    if (!refreshToken) {
      return res.status(500).send('未获取到 refresh_token，请确认 Google 应用已开启 Gmail API 且 redirect URI 精确匹配');
    }

    // 保存 refresh_token 到 Vercel KV
    await kv.set(KV_KEY, refreshToken);

    // 重定向回前端（带成功标记）
    return res.status(302).setHeader('Location', '/?gmail=connected').end();
  } catch (e) {
    return res.status(500).send('回调处理失败: ' + e.message);
  }
}
