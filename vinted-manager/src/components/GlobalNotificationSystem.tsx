'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function GlobalNotificationSystem() {
  const lastOrderIdRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchLatestSale = async () => {
      try {
        const res = await fetch('/api/notifications/sales/latest');
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.order && data.order.id) {
          if (isFirstLoad.current) {
            // Just initialize the ref, don't trigger toast on first load
            lastOrderIdRef.current = data.order.id;
            isFirstLoad.current = false;
            return;
          }

          if (lastOrderIdRef.current !== data.order.id) {
            // New sale detected!
            lastOrderIdRef.current = data.order.id;
            
            // Play cash sound
            try {
              const audio = new Audio('/sounds/cash.mp3');
              audio.volume = 0.5;
              audio.play().catch(e => console.log('Audio autoplay prevented:', e));
            } catch (e) {
              console.error('Failed to play sound', e);
            }

            // Show toast
            toast.success('Nouvelle Vente !', {
              description: `🌟 ${data.order.botAccount?.name || 'Bot'} a vendu : ${data.order.title} (${Number(data.order.price).toFixed(2)} €)`,
              duration: 8000,
              style: {
                background: 'rgba(250, 204, 21, 0.1)',
                borderColor: 'rgba(250, 204, 21, 0.4)',
                color: '#facc15'
              }
            });
          }
        }
      } catch (error) {
        console.error('Notification polling error:', error);
      }
    };

    // Check every 15 seconds
    const interval = setInterval(fetchLatestSale, 15000);
    
    // Initial fetch
    fetchLatestSale();

    return () => clearInterval(interval);
  }, []);

  return null;
}
