import { Router }     from 'express';
import nodemailer     from 'nodemailer';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const transporter = process.env.GMAIL_USER
    ? nodemailer.createTransport({
        host:   'smtp.gmail.com',
        port:   587,
        secure: false,
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    : null;

router.post('/email', requireAuth, async (req, res) => {
    if (!transporter) return res.status(200).json({ ok: true, info: 'Email desactivado (sin GMAIL_USER)' });

    const { titulo, precio_actual, precio_alerta } = req.body;
    const email = req.user.email;

    if (!titulo || !email) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Email de bienvenida a notificaciones
    if (titulo === '__bienvenida__') {
        const htmlBienvenida = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notificaciones activadas — GamePrice Tracker</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1117;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
      <tr><td style="background:#1a1d2e;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;border-bottom:2px solid #7c3aed;">
        <p style="margin:0 0 6px;font-size:2.2rem;line-height:1;">🎮</p>
        <p style="margin:0;font-size:1.3rem;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;">GamePrice Tracker</p>
        <p style="margin:4px 0 0;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Tu radar de precios gaming</p>
      </td></tr>
      <tr><td style="background:#1a1d2e;padding:40px 32px 32px;text-align:center;">
        <p style="font-size:2.8rem;margin:0 0 20px;">🔔</p>
        <h1 style="color:#e2e8f0;font-size:1.5rem;font-weight:800;margin:0 0 12px;">¡Notificaciones activadas!</h1>
        <p style="color:#94a3b8;font-size:0.95rem;line-height:1.75;margin:0 0 28px;">
          A partir de ahora te enviaremos un correo cuando alguno de tus juegos favoritos <strong style="color:#e2e8f0;">baje de precio</strong>.<br>No tienes que hacer nada más.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1117;border-radius:12px;border:1px solid #2a2d3e;margin-bottom:28px;text-align:left;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 12px;color:#64748b;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.8px;">¿Cómo funciona?</p>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:0.88rem;">❤️ &nbsp;Guarda un juego en favoritos</p>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:0.88rem;">📊 &nbsp;Monitoreamos el precio diariamente</p>
            <p style="margin:0;color:#94a3b8;font-size:0.88rem;">✉️ &nbsp;Te avisamos por email cuando baje</p>
          </td></tr>
        </table>
        <a href="https://gamepricetrackerr.netlify.app" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:1rem;padding:16px 40px;border-radius:12px;text-decoration:none;">Ir a GamePrice Tracker &nbsp;→</a>
      </td></tr>
      <tr><td style="background:#1a1d2e;padding:0 32px;"><div style="height:1px;background:#2a2d3e;"></div></td></tr>
      <tr><td style="background:#1a1d2e;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
        <p style="margin:0 0 4px;color:#64748b;font-size:0.8rem;">Con cariño,</p>
        <p style="margin:0 0 12px;color:#7c3aed;font-size:1rem;font-weight:700;">El Departamento GamePrice Tracker 🎮</p>
        <p style="margin:0;color:#334155;font-size:0.72rem;line-height:1.6;">© 2026 GamePrice Tracker · Todos los juegos. Todas las plataformas.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
        try {
            await transporter.sendMail({
                from:    `GamePrice Tracker <${process.env.GMAIL_USER}>`,
                to:      email,
                subject: '🔔 Notificaciones de precio activadas',
                html:    htmlBienvenida,
            });
        } catch (err) {
            console.error('[alertas/bienvenida]', err.message);
        }
        return res.status(200).json({ ok: true });
    }

    if (!precio_actual) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alerta de precio — GamePrice Tracker</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1117;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

      <tr><td style="background:#1a1d2e;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;border-bottom:2px solid #7c3aed;">
        <p style="margin:0 0 6px;font-size:2.2rem;line-height:1;">🎮</p>
        <p style="margin:0;font-size:1.3rem;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;">GamePrice Tracker</p>
        <p style="margin:4px 0 0;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Tu radar de precios gaming</p>
      </td></tr>

      <tr><td style="background:#1a1d2e;padding:40px 32px 32px;">
        <p style="text-align:center;font-size:2.8rem;margin:0 0 20px;">🎯</p>
        <h1 style="color:#e2e8f0;font-size:1.5rem;font-weight:800;text-align:center;margin:0 0 8px;">¡Alerta de precio!</h1>
        <p style="color:#94a3b8;font-size:0.95rem;text-align:center;margin:0 0 28px;">Uno de tus juegos favoritos bajó de precio.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1117;border-radius:12px;border:1px solid #2a2d3e;margin-bottom:28px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 14px;color:#94a3b8;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.8px;">Juego</p>
            <p style="margin:0 0 20px;color:#e2e8f0;font-size:1.1rem;font-weight:700;">${titulo}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:50%;text-align:center;padding:12px;background:#1a1d2e;border-radius:8px 0 0 8px;border:1px solid #2a2d3e;">
                  <p style="margin:0 0 4px;color:#64748b;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;">Precio actual</p>
                  <p style="margin:0;color:#10b981;font-size:1.4rem;font-weight:800;">$${precio_actual}</p>
                </td>
                <td style="width:50%;text-align:center;padding:12px;background:#1a1d2e;border-radius:0 8px 8px 0;border:1px solid #2a2d3e;border-left:none;">
                  <p style="margin:0 0 4px;color:#64748b;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;">Precio cuando guardaste</p>
                  <p style="margin:0;color:#7c3aed;font-size:1.4rem;font-weight:800;">$${precio_alerta}</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr><td align="center">
            <a href="https://gamepricetrackerr.netlify.app"
               style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:1rem;padding:16px 40px;border-radius:12px;text-decoration:none;">
              Ver precios ahora &nbsp;→
            </a>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="background:#1a1d2e;padding:0 32px;"><div style="height:1px;background:#2a2d3e;"></div></td></tr>

      <tr><td style="background:#1a1d2e;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
        <p style="margin:0 0 4px;color:#64748b;font-size:0.8rem;">Con cariño,</p>
        <p style="margin:0 0 12px;color:#7c3aed;font-size:1rem;font-weight:700;">El equipo de GamePrice Tracker 🎮</p>
        <p style="margin:0;color:#334155;font-size:0.72rem;line-height:1.6;">© 2026 GamePrice Tracker · Todos los juegos. Todas las plataformas.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

    try {
        await transporter.sendMail({
            from:    `GamePrice Tracker <${process.env.GMAIL_USER}>`,
            to:      email,
            subject: `🎯 ¡"${titulo}" bajó de precio!`,
            html,
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[alertas/email]', err.message);
        return res.status(500).json({ error: 'No se pudo enviar el email' });
    }
});

export default router;
