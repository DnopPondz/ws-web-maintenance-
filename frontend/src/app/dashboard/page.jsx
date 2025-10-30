"use client";

import Link from "next/link";

import PageContainer from "../components/PageContainer";

const quickLinks = [
  {
    title: "Maintenance log",
    description:
      "Review every update recorded for each platform, including version history and maintenance notes.",
    href: "/dashboard/history",
    icon: "history",
  },
  {
    title: "WordPress platform",
    description:
      "Inspect all active plugins, themes, and WordPress versions from a single workspace.",
    href: "/WordPress",
    icon: "language",
  },
  {
    title: "SupportPal platform",
    description:
      "Track SupportPal health, confirmation status, and maintenance records across every branch.",
    href: "/Supportpal",
    icon: "support_agent",
  },
];

const NavigatorCard = ({ title, description, href, icon }) => (
  <Link
    href={href}
    className="group block rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#316fb7]"
  >
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#316fb7]/10 text-2xl text-[#316fb7]">
        <span className="material-icons" aria-hidden>
          {icon}
        </span>
      </span>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#316fb7]">
      Open this section
      <span aria-hidden className="transition group-hover:translate-x-0.5">
        →
      </span>
    </span>
  </Link>
);

const DashboardPage = () => {
  return (
    <PageContainer
      meta="Navigator"
      title="Maintenance workspace"
      description="Pick a destination to begin maintenance work right away."
    >
      <section className="rounded-3xl bg-gradient-to-br from-[#1e3a64] via-[#1a2e52] to-[#13213c] p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Welcome back, Admin!
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Choose the platform you want to maintain today
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-white/80">
          This page serves as a shortcut to every part of the maintenance ecosystem—select a destination and start reviewing
          without repeating the same searches.
        </p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Core maintenance areas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Access the essential pages for reviewing records, confirmations, and follow-up tasks.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <NavigatorCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
};

export default DashboardPage;
