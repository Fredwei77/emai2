const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // GET /api/send-contact?verify=1 to verify SMTP connectivity on Vercel
  if (req.method === 'GET') {
    try {
      const verifyOnly = req.query && (req.query.verify === '1' || req.query.verify === 'true');
      if (!verifyOnly) {
        res.status(405).json({ ok: false, error: 'Method Not Allowed' });
        return;
      }
      const { transporter, to, from } = makeTransporterFromEnv();
      await transporter.verify();
      res.status(200).json({ ok: true, verify: true, to, from });
    } catch (e) {
      res.status(500).json({ ok: false, verify: false, error: e?.message || String(e) });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const raw = req.body;
    const data = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    const { name, email, phone, subject, message } = data;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ ok: false, error: '缺少必要字段（name, email, subject, message）' });
      return;
    }

    const { transporter, to, from } = makeTransporterFromEnv();

    // 验证 SMTP 连接/认证（失败会抛错，便于快速定位）
    await transporter.verify();

    const srcOrigin = (req.headers && (req.headers.origin || req.headers.referer)) || '';
    const srcIp = (req.headers && (req.headers['x-forwarded-for'] || req.headers['client-ip'])) || '';

    const text = `来自网站联系表单的新消息\n\n` +
      `姓名: ${name}\n` +
      `邮箱: ${email}\n` +
      `电话: ${phone || '-'}\n` +
      `主题: ${subject}\n\n` +
      `消息:\n${message}\n\n` +
      `来源: ${req.headers?.origin || ''} | IP: ${req.headers['x-forwarded-for'] || ''}`;

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6;">
        <h2 style="margin:0 0 12px;">来自网站联系表单的新消息</h2>
        <p><strong>姓名:</strong> ${escapeHtml(name)}</p>
        <p><strong>邮箱:</strong> ${escapeHtml(email)}</p>
        <p><strong>电话:</strong> ${escapeHtml(phone || '-')}</p>
        <p><strong>主题:</strong> ${escapeHtml(subject)}</p>
        <p><strong>消息:</strong></p>
        <pre style="white-space:pre-wrap;background:#f7f7f8;padding:12px;border-radius:8px;border:1px solid #eee;">${escapeHtml(message)}</pre>
        <hr />
        <p style="color:#666;font-size:12px;">来源: ${escapeHtml(req.headers?.origin || '')} | IP: ${escapeHtml(req.headers['x-forwarded-for'] || '')}</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: `[网站联系] ${subject} - ${name}`,
      replyTo: email,
      text,
      html,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
};

function makeTransporterFromEnv() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  // 自动判断 secure：若未显式设置 SMTP_SECURE，则按端口号决定（465 => true，其它 => false）
  const secure = (process.env.SMTP_SECURE || '').trim() !== ''
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : (port === 465);
  const to = process.env.MAIL_TO || 'weiyunming@emai2.cn';
  // 某些服务（163/QQ）要求 From 必须等于认证用户
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass) {
    const e = new Error('邮件服务未配置（请设置 SMTP_HOST/SMTP_USER/SMTP_PASS）');
    e.code = 'CONFIG_MISSING';
    throw e;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // 465 走 SSL；587 常用 STARTTLS（secure=false）
    auth: { user, pass },
  });
  return { transporter, to, from };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
