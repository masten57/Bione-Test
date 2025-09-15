// app/api/ping/route.js
export const runtime = 'nodejs';
import db from '@/lib/db';
export async function GET() {
  const [rows] = await db.query('SELECT DATABASE() db, NOW() now');
  return Response.json(rows[0]);
}
