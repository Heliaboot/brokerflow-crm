"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { WELCOME_BANNER_DISMISSED_KEY } from "@/lib/storage-config";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/Heliaboot/brokerflow-crm";
const BUSINESS_OVERVIEW_HREF = "/business-overview";
/** Listed seller with a listing agreement: a good first lead to look at. */
const SHOWCASE_LEAD_HREF = "/leads/l12";
/** Works from any page: goes to the home dashboard and jumps to its pipeline heading. */
const PIPELINE_HREF = "/#pipeline";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false; // storage blocked: just show the banner
  }
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

/** Action pill; the one for the page you're on is filled. */
function actionClass(current: boolean) {
  return cn(
    "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
    current
      ? "border-sky-700 bg-sky-700 text-white"
      : "border-sky-200 bg-white text-sky-900 hover:bg-sky-100",
    focusRing
  );
}

/**
 * Banner for recruiters / hiring managers: what this is, who made it, and three
 * quick things to try. Shown on the home dashboard, Business Overview and lead
 * pages so visitors can keep exploring. Closable; the choice is remembered in
 * localStorage (all pages) and cleared by Reset Demo.
 */
export function WelcomeBanner({ className }: { className?: string }) {
  const { setRole } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const onOverview = pathname === BUSINESS_OVERVIEW_HREF;
  const onShowcaseLead = pathname === SHOWCASE_LEAD_HREF;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, "1");
    } catch {
      // storage blocked: banner stays closed for this page view only
    }
  };

  const openBusinessOverview = () => {
    setRole("manager");
    if (!onOverview) router.push(BUSINESS_OVERVIEW_HREF);
  };

  return (
    <section
      aria-labelledby="welcome-banner-title"
      className={cn("rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 md:px-5", className)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4">
            <p id="welcome-banner-title" className="text-sm font-semibold text-zinc-900">
              Business analysis case study by Helia Bootorabi
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("shrink-0 self-start rounded text-xs font-medium text-sky-800 underline underline-offset-2 hover:text-sky-950", focusRing)}
            >
              Case study on GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <p className="text-sm text-zinc-700">
            A CRM I designed for a residential brokerage: five client pipelines, stage rules, reminders and manager reporting. All data is fictional.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs font-medium text-zinc-700">Try this:</span>
            <button
              type="button"
              onClick={openBusinessOverview}
              aria-current={onOverview ? "page" : undefined}
              className={actionClass(onOverview)}
            >
              See the owner&apos;s Business Overview
            </button>
            <Link
              href={SHOWCASE_LEAD_HREF}
              aria-current={onShowcaseLead ? "page" : undefined}
              className={actionClass(onShowcaseLead)}
            >
              Open a seller lead
            </Link>
            <Link href={PIPELINE_HREF} className={actionClass(false)}>
              See the pipeline
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close welcome banner"
          className={cn("shrink-0 rounded-md px-1.5 text-lg leading-none text-zinc-600 hover:bg-sky-100 hover:text-zinc-900", focusRing)}
        >
          ×
        </button>
      </div>
    </section>
  );
}
