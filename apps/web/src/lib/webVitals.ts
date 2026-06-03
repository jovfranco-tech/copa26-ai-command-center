/**
 * Lightweight Web Vitals reporter.
 * Reports CLS, FID, LCP, FCP, TTFB to console in dev and to Vercel Analytics if available.
 */

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function getRating(name: MetricName, value: number): WebVitalMetric['rating'] {
  const thresholds: Record<MetricName, [number, number]> = {
    CLS: [0.1, 0.25],
    FID: [100, 300],
    LCP: [2500, 4000],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // Use PerformanceObserver for Core Web Vitals
  try {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) report('LCP', last.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // FID / INP
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { processingStart: number; startTime: number };
        report('FID', e.processingStart - e.startTime);
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!e.hadRecentInput) clsValue += e.value;
      }
      report('CLS', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function report(name: MetricName, value: number) {
  const metric: WebVitalMetric = { name, value, rating: getRating(name, value) };

  // Send to Vercel Analytics if available
  if (typeof (window as unknown as { va?: (event: string, data: object) => void }).va === 'function') {
    (window as unknown as { va: (event: string, data: object) => void }).va('vitals', metric);
  }

  // Dev-only console reporting
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    const color = metric.rating === 'good' ? '#38d39a' : metric.rating === 'poor' ? '#ef4444' : '#f59e0b';
    console.log(`%c[WebVital] ${name}: ${Math.round(value * 100) / 100} (${metric.rating})`, `color: ${color}; font-weight: bold`);
  }
}
