import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function usePushNotifications(user) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check browser support
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const subscribe = async () => {
    if (!isSupported || !user) return;
    
    setIsLoading(true);
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      // Public VAPID key — safe to embed client-side by design (it's the "public" half of the pair;
      // the matching private key lives only in the backend function's environment secrets)
      const VAPID_PUBLIC_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY
        || 'BDM7K2_08BiYFpk1VvgdxuwILoo2gJor4fY8TW55kf-ilZx8r9pfF5r32et1K0IcFQEWNiQg7i0SZw3NWidxK7k';
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (subscription) {
        // Save subscription to database
        const subData = subscription.toJSON();
        await base44.entities.PushSubscription.create({
          user_email: user.email,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth,
          browser_info: navigator.userAgent,
          is_active: true
        });

        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !user) return;
    
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Mark subscription as inactive in database
        const subs = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          endpoint: subscription.toJSON().endpoint
        });
        
        if (subs.length > 0) {
          await base44.entities.PushSubscription.update(subs[0].id, {
            is_active: false
          });
        }

        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}