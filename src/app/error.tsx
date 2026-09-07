"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-red-500/30 bg-black">
        <img src="/hilman-logo.png" alt="HilmanAI" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-xl font-bold text-white">Bir şeyler ters gitti</h1>
      <p className="text-sm text-slate-400">HilmanAI yanıt verirken bir sorun oluştu.</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
