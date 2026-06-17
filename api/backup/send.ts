// Vercel Serverless Function — POST /api/backup/send
// Send backup data via email using SMTP
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed — use POST' });

  try {
    const { toEmail, backupData, backupDate } = req.body || {};

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !toEmail || !backupData) {
      return res.status(400).json({ error: 'SMTP not configured or missing backup data. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment variables.' });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: parseInt(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const formattedDate = new Date(backupDate || Date.now()).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const info = await transporter.sendMail({
      from: fromEmail || smtpUser,
      to: toEmail,
      subject: `📦 Backup Data ERP Near Bakery — ${formattedDate}`,
      text: `Backup data sistem ERP Near Bakery & Co.\n\nTanggal: ${formattedDate}\n\nFile backup terlampir dalam JSON.`,
      attachments: [{ filename: `near-bakery-backup-${new Date().toISOString().substring(0, 10)}.json`, content: backupData, contentType: 'application/json' }],
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Backup email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send backup email' });
  }
}
