import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="bg-gradient-to-b from-sky-soft/60 to-white">{children}</main>
    </>
  );
}
