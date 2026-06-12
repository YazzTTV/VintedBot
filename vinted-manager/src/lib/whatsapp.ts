import { env } from 'process'

const OPENWA_URL = env.OPENWA_URL || 'http://localhost:8000'
const OPENWA_API_KEY = env.OPENWA_API_KEY || ''
// Le numéro de Noah au format WhatsApp interne (ex: 33783642205@c.us)
const NOAH_WHATSAPP_ID = env.NOAH_WHATSAPP_ID || '33783642205@c.us'

export class WhatsAppService {
  /**
   * Envoie un simple message texte.
   */
  async sendText(text: string, to: string = NOAH_WHATSAPP_ID): Promise<boolean> {
    try {
      const response = await fetch(`${OPENWA_URL}/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': OPENWA_API_KEY ? `Bearer ${OPENWA_API_KEY}` : ''
        },
        body: JSON.stringify({
          args: {
            to,
            content: text
          }
        })
      })

      if (!response.ok) {
        console.error('OpenWA sendText Error:', await response.text())
        return false
      }
      return true
    } catch (error) {
      console.error('OpenWA sendText Exception:', error)
      return false
    }
  }

  /**
   * Envoie un fichier (ex: PDF du bordereau) avec une légende.
   */
  async sendFileFromUrl(url: string, filename: string, caption: string, to: string = NOAH_WHATSAPP_ID): Promise<boolean> {
    try {
      const response = await fetch(`${OPENWA_URL}/sendFileFromUrl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': OPENWA_API_KEY ? `Bearer ${OPENWA_API_KEY}` : ''
        },
        body: JSON.stringify({
          args: {
            to,
            url,
            filename,
            caption
          }
        })
      })

      if (!response.ok) {
        console.error('OpenWA sendFileFromUrl Error:', await response.text())
        return false
      }
      return true
    } catch (error) {
      console.error('OpenWA sendFileFromUrl Exception:', error)
      return false
    }
  }
}

export const whatsappService = new WhatsAppService()
export default whatsappService
