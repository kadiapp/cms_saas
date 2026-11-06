/**
 * Unified Analytics & Key Events Tracker
 * Sends events to Google Analytics 4 (gtag), Microsoft Clarity, and PostHog.
 * 
 * Standard GA4 event names (e.g. `search`, `sign_up`, `login`) and high-intent
 * conversions (`coding_assistant_search`, `send_to_claim_editor`, `claim_scrubbed`, 
 * `claim_exported`) will be captured as GA4 Key Events.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    clarity?: (action: string, ...args: any[]) => void;
    posthog?: {
      capture: (eventName: string, properties?: Record<string, any>) => void;
    };
  }
}

export function trackEvent(
  eventName: string,
  params: Record<string, any> = {}
) {
  if (typeof window === 'undefined') return;

  // 1. Google Analytics 4 (gtag / dataLayer buffer)
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...params,
      });
    }
  } catch (err) {
    console.debug('[Analytics] GA tracking error:', err);
  }

  // 2. Microsoft Clarity (custom event)
  try {
    if (typeof window.clarity === 'function') {
      window.clarity('event', eventName);
    }
  } catch (err) {
    console.debug('[Analytics] Clarity tracking error:', err);
  }

  // 3. PostHog (if active)
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, params);
    }
  } catch (err) {
    console.debug('[Analytics] PostHog tracking error:', err);
  }
}

/**
 * Key Event: User searches in Coding Assistant (Dictionary, NCCI, Medical Necessity, NPI, AI Autocoder)
 */
export function trackCodingSearch(tab: string, query: string) {
  // Standard GA4 event
  trackEvent('search', {
    search_term: query,
    search_category: tab,
  });

  // Custom Key Event
  trackEvent('coding_assistant_search', {
    tool_tab: tab,
    query_term: query,
  });
}

/**
 * High-Intent PLG Key Event: User transfers codes from Assistant into CMS-1500 Editor
 */
export function trackSendToClaimEditor(source: string, code?: string, codeType?: string) {
  trackEvent('send_to_claim_editor', {
    source,
    code: code || '',
    code_type: codeType || '',
  });
}

/**
 * Key Event: User scrubs or pre-validates a CMS-1500 claim
 */
export function trackClaimScrubbed(summary: {
  status: 'valid' | 'errors' | 'warnings';
  errorCount: number;
  warningCount: number;
  hasNpiErrors?: boolean;
  hasCptErrors?: boolean;
}) {
  trackEvent('claim_scrubbed', {
    claim_status: summary.status,
    errors_count: summary.errorCount,
    warnings_count: summary.warningCount,
    has_npi_errors: !!summary.hasNpiErrors,
    has_cpt_errors: !!summary.hasCptErrors,
  });
}

/**
 * Key Event: User exports a claim as PDF or EDI 837P
 */
export function trackClaimExported(format: 'PDF' | 'EDI') {
  trackEvent('claim_exported', {
    export_format: format,
  });
}

/**
 * Key Event: User pastes or uploads clinical documentation for AI Auto-Fill
 */
export function trackAiAutofillTriggered(sourceType: 'text' | 'file') {
  trackEvent('ai_autofill_triggered', {
    source_type: sourceType,
  });
}

/**
 * Standard GA4 Key Event: User signs up or logs in
 */
export function trackUserAuth(action: 'sign_up' | 'login', method: 'email' | 'google' | 'azure') {
  trackEvent(action, {
    method,
  });
}

/**
 * Engagement Key Event: CTA clicked across blog or marketing pages
 */
export function trackCtaClick(ctaName: string, destination: string, metadata?: Record<string, any>) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_destination: destination,
    ...metadata,
  });
}
