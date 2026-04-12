/**
 * Attribution Module — UTM capture + ad attribution tracking
 *
 * Captures UTM params + fbclid on landing, persists in localStorage.
 * Sends attribution to Supabase when user subscribes or signs up.
 * Also fires Meta Pixel events for client-side tracking.
 */

import { supabase } from './supabase.js';

const STORAGE_KEY = 'bowldem_attribution';

/**
 * Capture UTM params and fbclid from URL on landing.
 * Only captures if params are present (organic visits are ignored).
 * Persists in localStorage so attribution survives across sessions.
 */
export function captureAttribution() {
  const params = new URLSearchParams(window.location.search);

  const utm_source = params.get('utm_source');
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const utm_content = params.get('utm_content');
  const utm_term = params.get('utm_term');
  const fbclid = params.get('fbclid');

  // Only store if we have at least a source or fbclid (paid traffic)
  if (!utm_source && !fbclid) return;

  const attribution = {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    landed_at: new Date().toISOString(),
    device_id: localStorage.getItem('bowldem_device_id') || null,
    session_id: sessionStorage.getItem('bowldem_session_id') || null,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));

  // Clean UTM params from URL (keep it tidy, don't leak tracking to shares)
  if (utm_source || fbclid) {
    const url = new URL(window.location.href);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(p => url.searchParams.delete(p));
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  // Send landing event to Supabase (non-blocking)
  sendLandingAttribution(attribution);

  // Fire Meta Pixel PageView with attribution data
  if (typeof fbq === 'function') {
    fbq('track', 'PageView');
  }
}

/**
 * Get stored attribution data (or null if organic)
 */
export function getAttribution() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Send landing event to aq_attributions table
 */
async function sendLandingAttribution(attribution) {
  if (!supabase) return;

  try {
    await supabase.from('aq_attributions').insert([{
      device_id: attribution.device_id,
      session_id: attribution.session_id,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      fbclid: attribution.fbclid,
      landed_at: attribution.landed_at,
    }]);
  } catch (e) {
    console.warn('[Attribution] Failed to log landing:', e);
  }
}

/**
 * Mark attribution as converted (called on subscribe or auth signup).
 * Updates the existing attribution row and fires Meta Pixel + CAPI events.
 *
 * @param {string} email - subscriber email
 * @param {string} conversionType - 'email_subscribe' or 'auth_signup'
 */
export async function markConversion(email, conversionType = 'email_subscribe') {
  const attribution = getAttribution();

  // Fire Meta Pixel Subscribe event (client-side)
  if (typeof fbq === 'function') {
    fbq('track', 'Subscribe', { content_name: 'bowldem_newsletter' });
  }

  if (!supabase || !attribution) return;

  const deviceId = localStorage.getItem('bowldem_device_id');

  try {
    // Update the most recent attribution for this device
    await supabase
      .from('aq_attributions')
      .update({
        email,
        converted: true,
        conversion_type: conversionType,
        subscribed_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId)
      .eq('converted', false)
      .order('landed_at', { ascending: false })
      .limit(1);

    // Fire server-side CAPI event (non-blocking)
    try {
      await supabase.functions.invoke('meta-capi-event', {
        body: {
          event_name: 'Subscribe',
          email,
          fbclid: attribution.fbclid,
          utm_source: attribution.utm_source,
          utm_content: attribution.utm_content,
        }
      });
    } catch (e) {
      console.warn('[Attribution] CAPI event failed (non-blocking):', e);
    }
  } catch (e) {
    console.warn('[Attribution] Failed to mark conversion:', e);
  }
}

/**
 * Mark when user plays a puzzle (for funnel tracking)
 */
export async function markPuzzlePlayed() {
  const attribution = getAttribution();
  if (!supabase || !attribution) return;

  const deviceId = localStorage.getItem('bowldem_device_id');

  try {
    await supabase
      .from('aq_attributions')
      .update({ puzzle_played_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('converted', false)
      .is('puzzle_played_at', null)
      .order('landed_at', { ascending: false })
      .limit(1);
  } catch (e) {
    console.warn('[Attribution] Failed to mark puzzle played:', e);
  }

  // Fire Meta Pixel custom event
  if (typeof fbq === 'function') {
    fbq('trackCustom', 'PuzzlePlayed');
  }
}
