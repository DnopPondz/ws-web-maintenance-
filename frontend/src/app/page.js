"use client";

import Image from "next/image";
import Link from "next/link";

import PageContainer from "./components/PageContainer";
import { useAuth } from "./lib/auth-context";

const SERVICES = [
  {
    name: "WordPress",
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
      maxWidth="max-w-6xl"
    >
      <section className="mb-6">
        <div className="rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">Quick Links</h2>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <Link href="/dashboard" className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 block hover:bg-slate-100/60">
                    <p className="font-medium text-slate-900">Dashboard</p>
                    <p className="text-slate-600">Overview of all systems</p>
                </Link>
                <Link href="/admin" className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 block hover:bg-slate-100/60">
                    <p className="font-medium text-slate-900">Admin</p>
                    <p className="text-slate-600">User management</p>
                </Link>
            </div>
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
