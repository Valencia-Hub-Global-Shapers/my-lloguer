import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { I18nProvider } from "@/i18n/client";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentProfile } from "@/features/auth/server/session";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const profile = await getCurrentProfile();

  return (
    <I18nProvider locale={locale as Locale} dict={dict}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale as Locale} profile={profile} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
      <Toaster />
    </I18nProvider>
  );
}
