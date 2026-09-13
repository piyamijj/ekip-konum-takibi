import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col gap-3">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent">
          Rıza Temelli · Ekip İçi
        </span>
        <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
          Ekip Konum Takibi
        </h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Ekibinizdeki kişilerin, yalnızca kendileri açıkça izin verdiği sürece,
          canlı konumunu tek bir panoda görün. Herkes kendi paylaşımını
          istediği an açıp kapatabilir.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link
          href="/join"
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 text-left shadow-card transition hover:border-accent"
        >
          <span className="text-sm font-semibold text-accent">Ekibe Katıl</span>
          <span className="text-xs text-slate-400">
            Adınızı girin, davet kodunu kullanın ve konum paylaşımınızı açık
            şekilde başlatın.
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 text-left shadow-card transition hover:border-accent"
        >
          <span className="text-sm font-semibold text-accentAlt">Panoyu Görüntüle</span>
          <span className="text-xs text-slate-400">
            Konum paylaşımı açık olan ekip üyelerini harita üzerinde canlı
            olarak izleyin.
          </span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surfaceAlt px-4 py-3 text-xs text-slate-500">
        <p>
          Bu uygulama yalnızca GPS izni verilen cihazların konumunu gösterir.
          OSINT, telefon numarasından konum tahmini, veri ihlali taraması veya
          risk skoru hesaplama gibi özellikler içermez ve içermeyecektir.
        </p>
      </div>
    </main>
  );
}