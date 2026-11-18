import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "../auth-form";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, error } = await searchParams;
  return (
    <div className="px-4 py-10 sm:py-16">
      <AuthForm mode="reset" next={next} initialError={error ? "generic" : undefined} />
    </div>
  );
}
