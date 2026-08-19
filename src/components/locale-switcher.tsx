"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const pathWithoutLocale = pathname.replace(/^\/(es|ca|en)/, "") || "/";
  const qs = searchParams.toString();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("common.language")}>
          <Languages />
          <span className="hidden sm:inline">{localeLabels[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem key={l} asChild>
            <Link
              href={`/${l}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}${qs ? `?${qs}` : ""}`}
              aria-current={l === locale ? "true" : undefined}
            >
              {localeLabels[l]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
