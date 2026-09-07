import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black">
        <img src="/hilman-logo.png" alt="HilmanAI" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">404</h1>
      <p className="text-sm text-slate-400">Aradığınız sayfa bulunamadı.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
      >
        HilmanAI&apos;ya Dön
      </Link>
    </div>
  );
}
