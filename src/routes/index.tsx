import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copy, crops, type Crop, type Lang } from "@/lib/soil-copy";
import {
  getSoilReport,
  initialPoint,
  initialReport,
  type Point,
  type SoilReport,
  type Status,
} from "@/lib/soil-report";

const SoilMap = lazy(() => import("@/components/soil-map"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: copy.en.titleMeta },
      { name: "description", content: copy.en.descriptionMeta },
      { property: "og:title", content: copy.en.titleMeta },
      { property: "og:description", content: copy.en.descriptionMeta },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const statusClass: Record<Status, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  poor: "bg-status-poor",
};

type Depth = "surface" | "subsoil" | "deep";

function layerAt(report: SoilReport, depth: Depth) {
  if (depth === "subsoil" && report.subsoil) return report.subsoil;
  if (depth === "deep" && report.deep) return report.deep;
  return report.surface;
}

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [crop, setCrop] = useState<Crop>("Mango");
  const [point, setPoint] = useState<Point>(initialPoint);
  const [report, setReport] = useState<SoilReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [depth, setDepth] = useState<Depth>("surface");
  const request = useRef(0);

  const t = copy[lang];

  const statusLabel: Record<Status, string> = {
    good: t.favorable,
    warning: t.attention,
    poor: t.unsuitable,
  };

  async function assess(nextPoint: Point, nextCrop: Crop, nextLang: Lang = lang) {
    const id = ++request.current;
    setPoint(nextPoint);
    setCrop(nextCrop);
    setDepth("surface");
    setLoading(true);
    setError(false);
    try {
      const result = await getSoilReport(nextPoint.lat, nextPoint.lon, nextCrop, nextLang);
      if (id === request.current) setReport(result);
    } catch {
      if (id === request.current) setError(true);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  function handleLangChange(nextLang: Lang) {
    if (nextLang === lang) return;
    setLang(nextLang);
    void assess(point, crop, nextLang);
  }

  const mapFallback = (
    <div className="map-shell grid place-items-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
      {t.mapLoading}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="page-width flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="brand-name text-xl font-semibold text-primary">{t.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.tagline}</p>
          </div>
          <div className="flex items-center gap-5">
            {/* Bilingual Toggle */}
            <div className="flex items-center rounded-md border border-border bg-muted p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleLangChange("en")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  lang === "en"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLangChange("mr")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  lang === "mr"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                मराठी
              </button>
            </div>
            <div className="hidden items-center gap-7 text-xs md:flex">
              <span className="text-muted-foreground">{t.region}</span>
              <span className="border-l border-border pl-7 font-medium text-primary">{t.view}</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="page-width flex flex-wrap items-end justify-between gap-6 pb-7 pt-9">
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
              {t.eyebrow}
            </p>
            <h1 className="text-[32px] leading-tight font-medium">{t.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <span className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-status-warning" />
              {t.demo}
            </span>
            <div className="w-44">
              <label id="crop-label" className="mb-2 block text-xs font-medium">
                {t.crop}
              </label>
              <Select
                value={crop}
                onValueChange={(value) => {
                  if (crops.includes(value as Crop)) void assess(point, value as Crop, lang);
                }}
              >
                <SelectTrigger aria-labelledby="crop-label" className="h-11 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t.crops[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="page-width">
          <ClientOnly fallback={mapFallback}>
            <Suspense fallback={mapFallback}>
              <SoilMap
                point={point}
                onSelect={(p) => {
                  void assess(p, crop, lang);
                }}
              />
            </Suspense>
          </ClientOnly>
        </div>

        <section className="page-width pb-10 pt-7" aria-label={t.report} aria-busy={loading}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {t.report}
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                / {t.crops[crop]}
              </span>
            </h2>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">{t.selected}</span>
              <span className="coordinate font-medium">
                {point.lat.toFixed(4)}° N, {point.lon.toFixed(4)}° E
              </span>
            </p>
          </div>

          <div className="report-body" aria-live="polite">
            {loading ? (
              <div className="report-empty flex items-center gap-3 text-muted-foreground">
                <span className="soil-spinner" />
                {t.loading}
              </div>
            ) : error ? (
              <div className="report-empty text-muted-foreground">{t.error}</div>
            ) : !report ? (
              <div className="report-empty text-muted-foreground">{t.empty}</div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">{t.summary}</h3>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    {(["good", "warning", "poor"] as Status[]).map((status) => (
                      <span key={status} className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${statusClass[status]}`} />
                        {statusLabel[status]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                  {report.summary.map((item, idx) => (
                    <p key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${statusClass[item.status]}`}
                        role="img"
                        aria-label={statusLabel[item.status]}
                      />
                      <span>{String((t as Record<string, unknown>)[item.text] ?? item.text)}</span>
                    </p>
                  ))}
                </div>

                <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xs font-semibold text-muted-foreground">{t.data}</h3>
                    {(report.subsoil || report.deep) && (
                      <div
                        role="tablist"
                        aria-label={t.depths}
                        className="flex items-center gap-1 rounded-md border border-border bg-muted p-1"
                      >
                        {/* Surface layer tab */}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={depth === "surface"}
                          onClick={() => setDepth("surface")}
                          className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            depth === "surface" ? "bg-card shadow-sm" : "text-muted-foreground"
                          }`}
                        >
                          {t.depthSurface}
                        </button>

                        {/* Subsoil layer tab */}
                        {report.subsoil && (
                          <button
                            type="button"
                            role="tab"
                            aria-selected={depth === "subsoil"}
                            onClick={() => setDepth("subsoil")}
                            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              depth === "subsoil" ? "bg-card shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            {t.depthSubsoil}
                          </button>
                        )}

                        {/* 15-30cm Reference tab with distinct outlined pill */}
                        {report.deep && (
                          <button
                            type="button"
                            role="tab"
                            aria-selected={depth === "deep"}
                            onClick={() => setDepth("deep")}
                            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              depth === "deep" ? "bg-card shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            <span>{t.depthDeep}</span>
                            <span className="rounded border border-border/80 px-1 py-0.5 text-[9px] font-normal tracking-wide text-muted-foreground">
                              {t.depthRefBadge}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.measured}</span>
                </div>

                <dl className="soil-data grid grid-cols-2 gap-y-6 md:grid-cols-5">
                  <Metric
                    label={t.labels.ph}
                    value={layerAt(report, depth).ph.toFixed(1)}
                    unit={t.units.ph}
                  />
                  <Metric
                    label={t.labels.carbon}
                    value={layerAt(report, depth).carbon.toFixed(2)}
                    unit={t.units.percent}
                  />
                  <Metric label={t.labels.texture} value={layerAt(report, depth).textureLabel} />
                  <div className="metric">
                    <dt>{t.labels.fractions}</dt>
                    <dd className="mt-3 flex gap-3 text-lg font-medium">
                      {[
                        layerAt(report, depth).clay,
                        layerAt(report, depth).sand,
                        layerAt(report, depth).silt,
                      ].map((value, index) => (
                        <span key={index}>
                          {value}
                          <span className="text-xs text-muted-foreground">%</span>
                        </span>
                      ))}
                    </dd>
                    <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
                      <span>{t.fractions.clay}</span>
                      <span>{t.fractions.sand}</span>
                      <span>{t.fractions.silt}</span>
                    </div>
                  </div>
                  <Metric
                    label={t.labels.density}
                    value={layerAt(report, depth).density.toFixed(2)}
                    unit={t.units.density}
                  />
                </dl>

                <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-[11px] text-muted-foreground">
                  <p>{t.source}</p>
                  {report.estimated && <p>{t.estimated}</p>}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="page-width flex flex-wrap justify-between gap-3 py-5 text-[10px] text-muted-foreground">
          <span>{t.footer}</span>
          <span>{t.footerNote}</span>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd className="mt-3 text-[22px] leading-tight font-medium">{value}</dd>
      {unit && <p className="mt-2 text-[10px] text-muted-foreground">{unit}</p>}
    </div>
  );
}
