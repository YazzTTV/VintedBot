import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VenteEnRetard {
  id: string
  pseudoAcheteur: string
  dateLimiteExpedition: string | null
  prixVente?: number | null
  statut?: string | null
}

interface AlertParcel {
  id: string
  trackingNumber: string
  carrier?: string | null
  status?: string | null
  alertType?: 'OVERDUE' | 'ESTIMATED_LATE'
  ventesEnRetard: VenteEnRetard[]
}

interface SendParcelAlertsEmailParams {
  to: string
  alerts: AlertParcel[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusLabel(alertType?: string): string {
  if (alertType === 'OVERDUE') return 'DEADLINE DEPASSEE'
  if (alertType === 'ESTIMATED_LATE') return 'LIVRAISON TARDIVE'
  return 'ALERTE'
}

function statusColor(alertType?: string): string {
  return alertType === 'OVERDUE' ? '#ef4444' : '#f97316'
}

// ---------------------------------------------------------------------------
// HTML email builder
// ---------------------------------------------------------------------------

function buildEmailHtml(alerts: AlertParcel[], appUrl: string): string {
  const totalVentes = alerts.reduce((sum, p) => sum + p.ventesEnRetard.length, 0)

  const parcelRows = alerts
    .map((parcel) => {
      const label = statusLabel(parcel.alertType)
      const color = statusColor(parcel.alertType)

      const ventesHtml = parcel.ventesEnRetard
        .map(
          (v) => `
          <tr>
            <td style="padding:6px 12px;font-size:13px;color:#e4e4e7;">@${v.pseudoAcheteur}</td>
            <td style="padding:6px 12px;font-size:13px;color:#a1a1aa;">${formatDeadline(v.dateLimiteExpedition)}</td>
          </tr>`
        )
        .join('')

      return `
      <div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-family:monospace;font-size:15px;font-weight:700;color:#ffffff;">${parcel.trackingNumber}</span>
          <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${color}20;color:${color};border:1px solid ${color}40;">
            ${label}
          </span>
        </div>
        <p style="margin:0 0 4px;font-size:12px;color:#71717a;">
          Transporteur : <strong style="color:#a1a1aa;">${parcel.carrier ?? '—'}</strong>
          &nbsp;|&nbsp;
          Statut : <strong style="color:#a1a1aa;">${parcel.status ?? '—'}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="background:#27272a;">
              <th style="padding:6px 12px;text-align:left;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.05em;">Acheteur</th>
              <th style="padding:6px 12px;text-align:left;font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.05em;">Deadline</th>
            </tr>
          </thead>
          <tbody>${ventesHtml}</tbody>
        </table>
      </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626,#9f1239);border-radius:16px 16px 0 0;padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">
        Alerte Colis Vinted
      </h1>
      <p style="margin:6px 0 0;font-size:14px;color:#fca5a5;">
        ${alerts.length} colis avec ${totalVentes} vente${totalVentes > 1 ? 's' : ''} en retard
      </p>
    </div>

    <!-- Body -->
    <div style="background:#0f0f10;border:1px solid #27272a;border-top:none;border-radius:0 0 16px 16px;padding:28px 32px;">
      ${parcelRows}

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}/parcels"
           style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;">
          Voir tous les colis
        </a>
      </div>

      <p style="margin:24px 0 0;font-size:11px;color:#3f3f46;text-align:center;">
        Vinted Manager — rapport automatique
      </p>
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function sendParcelAlertsEmail({
  to,
  alerts,
}: SendParcelAlertsEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY non defini' }
  }

  const from =
    process.env.RESEND_FROM ?? 'Vinted Manager <onboarding@resend.dev>'
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

  const totalVentes = alerts.reduce((sum, p) => sum + p.ventesEnRetard.length, 0)
  const subject = `[Vinted] ${alerts.length} colis — ${totalVentes} vente${totalVentes > 1 ? 's' : ''} en retard`

  const resend = new Resend(apiKey)

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html: buildEmailHtml(alerts, appUrl),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return { success: false, error: message }
  }
}
