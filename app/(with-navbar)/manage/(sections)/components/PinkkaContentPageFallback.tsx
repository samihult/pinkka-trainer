import { useI18n } from "@/lib/i18n";

export function PinkkaContentPageFallback() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">{t("manage.pinkka.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("manage.pinkka.loading")}
          </p>
        </div>
        <div className="h-[70vh] rounded-md border border-border bg-muted/20" />
      </main>
    </div>
  );
}
