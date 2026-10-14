import type { Exam, Task } from "../types/catalog";

const GA_MEASUREMENT_ID = "G-MT0CRL07ZJ";
const GA_DISABLED_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
const GA_COOKIE_NAMES = ["_ga", `_ga_${GA_MEASUREMENT_ID.replace("G-", "")}`];

let isAnalyticsConfigured = false;

type ConsentState = "granted" | "denied";

export type ExamOpenParams = {
  exam_id: string;
  exam_code: string;
  exam_year: number;
  exam_session: string;
  exam_variant: string;
};

export type TaskOpenParams = {
  task_id: string;
  task_type: string;
  task_part: number;
  exam_id: string;
  exam_code: string;
};

export type AnalyticsEventParams = {
  exam_open: ExamOpenParams;
  task_open: TaskOpenParams;
};

export type AnalyticsEventName = keyof AnalyticsEventParams;

type GtagCommand =
  | ["js", Date]
  | ["config", string]
  | [
      "consent",
      "default" | "update",
      {
        analytics_storage?: ConsentState;
        ad_storage?: ConsentState;
        ad_user_data?: ConsentState;
        ad_personalization?: ConsentState;
      },
    ]
  | [
      "event",
      AnalyticsEventName,
      AnalyticsEventParams[AnalyticsEventName],
    ];

declare global {
  interface Window {
    dataLayer?: GtagCommand[];
    gtag?: (...args: GtagCommand) => void;
  }
}

function ensureGtag() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: GtagCommand) {
      window.dataLayer?.push(args);
    };
}

function setGoogleAnalyticsDisabled(isDisabled: boolean) {
  (window as unknown as Record<string, boolean>)[GA_DISABLED_KEY] = isDisabled;
}

function removeAnalyticsScripts() {
  document
    .querySelectorAll<HTMLScriptElement>(`script[src*="${GA_MEASUREMENT_ID}"]`)
    .forEach((script) => {
      script.remove();
    });
}

function deleteCookie(name: string, domain?: string) {
  const domainAttribute = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=; Max-Age=0; path=/${domainAttribute}; SameSite=Lax`;
}

function clearGoogleAnalyticsCookies() {
  const hostParts = window.location.hostname.split(".");
  const domainCandidates = new Set<string | undefined>([
    undefined,
    window.location.hostname,
  ]);

  for (let index = 0; index < hostParts.length - 1; index += 1) {
    domainCandidates.add(`.${hostParts.slice(index).join(".")}`);
  }

  GA_COOKIE_NAMES.forEach((cookieName) => {
    domainCandidates.forEach((domain) => deleteCookie(cookieName, domain));
  });
}

export function denyAnalyticsConsent() {
  ensureGtag();
  setGoogleAnalyticsDisabled(true);
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  isAnalyticsConfigured = false;
  removeAnalyticsScripts();
  clearGoogleAnalyticsCookies();
}

export function loadAnalytics() {
  if (isAnalyticsConfigured) {
    return;
  }

  ensureGtag();
  setGoogleAnalyticsDisabled(false);

  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (
    !document.querySelector<HTMLScriptElement>(
      `script[src*="${GA_MEASUREMENT_ID}"]`,
    )
  ) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.append(script);
  }

  window.gtag?.("js", new Date());
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag?.("config", GA_MEASUREMENT_ID);
  isAnalyticsConfigured = true;
}

export function trackEvent<EventName extends AnalyticsEventName>(
  eventName: EventName,
  params: AnalyticsEventParams[EventName],
) {
  if (!isAnalyticsConfigured) {
    return;
  }

  window.gtag?.("event", eventName, params);
}

export function trackExamOpen(
  exam: Pick<Exam, "id" | "code" | "year" | "session" | "variant">,
) {
  trackEvent("exam_open", {
    exam_id: exam.id,
    exam_code: exam.code,
    exam_year: exam.year,
    exam_session: exam.session,
    exam_variant: exam.variant,
  });
}

export function trackTaskOpen(
  task: Pick<Task, "id" | "type" | "part">,
  exam: Pick<Exam, "id" | "code">,
) {
  trackEvent("task_open", {
    task_id: task.id,
    task_type: task.type,
    task_part: task.part,
    exam_id: exam.id,
    exam_code: exam.code,
  });
}
