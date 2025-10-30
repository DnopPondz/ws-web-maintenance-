"use client";

import Image from "next/image";
import Link from "next/link";

import PageContainer from "./components/PageContainer";
import { useAuth } from "./lib/auth-context";

const SERVICES = [
  {
    name: "WordPress",
    description:
      "Review plugin updates, confirm content deployments, and track maintenance history for each site.",
    href: "/WordPress",
    badge: "Weekly resets • Mondays 00:00 (Asia/Bangkok)",
    image: {
      src: "/logo-image/wordpress-logo.png",
      alt: "WordPress logo",
    },
    gradient: "from-[#f0f6ff] to-white",
  },
  {
    name: "SupportPal",
    description:
      "Monitor ticketing infrastructure, confirm server updates, and document follow-up actions.",
    href: "/Supportpal",
    badge: "Monthly resets • 1st day 00:00 (Asia/Bangkok)",
    image: {
      src: "/logo-image/supportpal-logo.png",
      alt: "SupportPal logo",
    },
    gradient: "from-[#e8f1ff] to-white",
  },
];

const Home = () => {
  const { user } = useAuth();

  const greetingName = [user?.firstname, user?.username, user?.email].find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  const safeGreeting = greetingName ? greetingName.trim() : "";

  return (
    <PageContainer
      meta="Maintenance workspace"
      title={`Welcome back${safeGreeting ? ", " + safeGreeting : ""}!`}
      description="Choose the platform you would like to maintain. Everything shares the same visual language so you can move between systems with confidence."
      actions={
        <div className="rounded-2xl bg-white/70 px-6 py-4 text-sm text-slate-600 shadow-sm backdrop-blur">
          <p className="font-semibold text-[#316fb7]">Today&apos;s reminder</p>
          <p className="mt-1 leading-relaxed">
            Confirm WordPress updates by Monday midnight and SupportPal updates by the first of each
            month. Keeping confirmations up to date helps everyone stay in sync.
          </p>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">Your maintenance hub</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Stay on top of every release cycle with a unified, familiar interface. Jump directly
              into a platform or review the combined health metrics from the dashboard.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#316fb7]">
                  Quick access
                </p>
                <p className="mt-2 font-medium text-slate-900">Dashboard overview</p>
                <p className="mt-1 text-slate-600">See confirmations and pending work in one place.</p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center justify-start text-sm font-semibold text-[#316fb7] hover:text-[#254d85]"
                >
                  Go to dashboard →
                </Link>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#316fb7]">
                  Need a hand?
                </p>
                <p className="mt-2 font-medium text-slate-900">Team contacts</p>
                <p className="mt-1 text-slate-600">
                  Reach the platform lead directly from the admin panel.
                </p>
                <Link
                  href="/admin"
                  className="mt-3 inline-flex items-center justify-start text-sm font-semibold text-[#316fb7] hover:text-[#254d85]"
                >
                  Manage users →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-lg backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Maintenance at a glance</h3>
          <ul className="mt-5 space-y-4 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#316fb7]" />
              <div>
                <p className="font-medium text-slate-900">Consistent theme</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  Every screen shares the same layout language for predictable navigation.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#316fb7]" />
              <div>
                <p className="font-medium text-slate-900">Quick confirmation cues</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  Status pills and grouped notes help highlight what still requires attention.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#316fb7]" />
              <div>
                <p className="font-medium text-slate-900">Shared documentation</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  Reference the maintenance log to understand who confirmed what and when.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {SERVICES.map((service) => (
          <Link key={service.name} href={service.href} className="group">
            <article
              className={`relative h-full overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br ${service.gradient} p-8 shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow">
                  <Image
                    src={service.image.src}
                    alt={service.image.alt}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{service.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[#316fb7]">{service.badge}</p>
                </div>
              </div>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                {service.description}
              </p>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#316fb7] transition-colors group-hover:text-[#254d85]">
                Open workspace →
              </span>
            </article>
          </Link>
        ))}
      </section>
    </PageContainer>
  );
};

export default Home;
