// pages/api/login.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const NS_RE = /^[a-zA-Z0-9_-]{3,32}$/;
function safeGetNs(req) {
  const q = req.query?.ns;
  const fromBody = req.body?.ns;
  const fromHeader = req.headers['x-bione-ns'];
  const cookieMatch = /(?:^|;\s*)ns=([^;]+)/.exec(req.headers.cookie || '');
  return (q || fromBody || fromHeader || cookieMatch?.[1] || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ns = safeGetNs(req);
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password || !NS_RE.test(ns)) {
    return res.status(400).json({ error: 'Email, password, dan ns wajib (ns 3–32 alnum/_-).' });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.password, u.verification_status_id, u.rejection_reason
       FROM users u WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Email atau password salah' });

    const u = rows[0];
    if (u.verification_status_id === 1)
      return res.status(403).json({ error: 'Akun Anda masih menunggu verifikasi admin (Pending).' });
    if (u.verification_status_id === 3)
      return res.status(403).json({ error: `Akun Anda ditolak.${u.rejection_reason ? ' Alasan: ' + u.rejection_reason : ''}` });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(u.id), email: u.email, name: u.name, phone: u.phone ?? null, ns
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      `user_session_${ns}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`,
      `user_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
      `user_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
      `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
    ]);

    return res.status(200).json({
      ok: true,
      ns,
      redirect: `/User/HalamanUtama/hal-utamauser?ns=${encodeURIComponent(ns)}`,
      whoami: { id: u.id, email: u.email, name: u.name, ns },
    });
  } catch (e) {
    console.error('LOGIN_ERROR', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
