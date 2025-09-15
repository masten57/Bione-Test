import db from '@/lib/db';

export default async function handler(req, res) {
  try {
    const [rows] = await db.query('SELECT DATABASE() db, NOW() now');
    res.status(200).json(rows[0]);
  } catch (e) {
    console.error('PING_ERROR', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
