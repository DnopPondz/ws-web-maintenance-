"use client";

import Link from "next/link";

import PageContainer from "../components/PageContainer";

const quickLinks = [
  {
    title: "Maintenance log",
    description:
      "ดูประวัติการอัปเดตทั้งหมดของแต่ละระบบ รวมถึงรายละเอียดเวอร์ชันและบันทึกงานซ่อมบำรุง.",
    href: "/dashboard/history",
    icon: "history",
  },
  {
    title: "ระบบ WordPress",
    description:
      "เข้าถึงพื้นที่สำหรับตรวจสอบปลั๊กอิน ธีม และเวอร์ชัน WordPress ที่มีอยู่ทั้งหมด.",
    href: "/WordPress",
    icon: "language",
  },
  {
    title: "ระบบ SupportPal",
    description:
      "ติดตามสถานะและบันทึกการดูแลรักษาของ SupportPal ในแต่ละสาขา.",
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
      เปิดหน้าดังกล่าว
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
      description="เลือกปลายทางที่ต้องการดูแลรักษาเพื่อเริ่มต้นทำงานได้อย่างรวดเร็ว"
    >
      <section className="rounded-3xl bg-gradient-to-br from-[#1e3a64] via-[#1a2e52] to-[#13213c] p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Welcome back, Admin!
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          เลือกแพลตฟอร์มที่คุณต้องการดูแลในวันนี้
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-white/80">
          หน้านี้ออกแบบมาเพื่อเป็นทางลัดไปยังส่วนต่าง ๆ ของระบบดูแลรักษา
          ไม่ต้องค้นหาข้อมูลซ้ำซ้อน — เลือกปลายทางที่ต้องการแล้วเริ่มตรวจสอบได้เลย
        </p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">ส่วนหลักของการดูแล</h2>
            <p className="mt-1 text-sm text-slate-600">
              เข้าถึงหน้าสำคัญที่ใช้ตรวจสอบบันทึกและรายละเอียดการดูแลทั้งหมด.
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
