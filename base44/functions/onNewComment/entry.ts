import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function signVapid(audience: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud: audience, exp: now + 12 * 3600, sub: subject };
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64 = encode(header);
  const claimsB64 = encode(claims);
  const signingInput = `${headerB64}.${claimsB64}`;
  const keyData = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${signingInput}.${sigB64}`;
}

async function sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPublicKey: string, vapidPrivateKey: string): Promise<Response> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await signVapid(audience, 'mailto:tarek-samara@lbc-hub.com', vapidPublicKey, vapidPrivateKey);
  const vapidHeader = `vapid t=${jwt},k=${vapidPublicKey}`;
  const p256dh = Uint8Array.from(atob(sub.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const auth = Uint8Array.from(atob(sub.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const ephemeralKey = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const recipientKey = await crypto.subtle.importKey('raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientKey }, ephemeralKey.privateKey, 256);
  const ephemeralPublicKeyRaw = await crypto.subtle.exportKey('raw', ephemeralKey.publicKey);
  const prk = await crypto.subtle.importKey('raw', new Uint8Array(sharedBits), { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\x00'), ...p256dh, ...new Uint8Array(ephemeralPublicKeyRaw)]);
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: auth, info: ikmInfo }, prk, 256);
  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const cek = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: aes128gcm\x00') }, ikmKey, 128);
  const nonceBytes = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: nonce\x00') }, ikmKey, 96);
  const contentKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = new Uint8Array(nonceBytes);
  const plaintext = new Uint8Array([...new TextEncoder().encode(payload), 0x02]);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, plaintext);
  const keyIdRaw = new Uint8Array(ephemeralPublicKeyRaw);
  const body = new Uint8Array([...salt, ...new Uint8Array([0, 0, 16, 0]), ...[keyIdRaw.length], ...keyIdRaw, ...new Uint8Array(ciphertext)]);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Content-Length': body.length.toString(),
    },
    body,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const comment = payload.data;

    if (!comment) return Response.json({ error: 'No comment data in payload' }, { status: 400 });

    const user_email = comment.post_author_email;
    if (!user_email) return Response.json({ message: 'No post author to notify' });
    if (user_email === comment.author_email) return Response.json({ message: 'Author commented on own post, skipping' });

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
      || 'BDM7K2_08BiYFpk1VvgdxuwILoo2gJor4fY8TW55kf-ilZx8r9pfF5r32et1K0IcFQEWNiQg7i0SZw3NWidxK7k';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPrivateKey) {
      console.error('VAPID_PRIVATE_KEY not set');
      return Response.json({ error: 'Push service not configured' }, { status: 500 });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_email, is_active: true });
    if (!subscriptions || subscriptions.length === 0) return Response.json({ message: 'No active subscriptions found' });

    const commenterName = comment.author_name || 'Someone';
    const preview = comment.content?.slice(0, 80) || '';
    const notificationPayload = JSON.stringify({
      title: `${commenterName} commented on your post`,
      body: preview,
      url: '/Social',
      type: 'comment',
      tag: `comment-${comment.post_id}`
    });

    const results = [];
    const errors = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, notificationPayload, vapidPublicKey, vapidPrivateKey);
        if (!response.ok) {
          if (response.status === 410) await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false });
          errors.push({ subscription_id: sub.id, status: response.status });
        } else {
          results.push({ subscription_id: sub.id, status: 'sent' });
        }
      } catch (err) {
        errors.push({ subscription_id: sub.id, error: err.message });
      }
    }

    return Response.json({ success: true, user_email, sent: results.length, failed: errors.length });
  } catch (error) {
    console.error('onNewComment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
