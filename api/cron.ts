/** GET /api/cron — recordatorios (versión de diagnóstico) */
export default async function handler(req: any, res: any): Promise<void> {
  try {
    res.status(200).json({ ok: true, probe: 'cron-vivo', q: req && req.query });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.stack || e) });
  }
}
