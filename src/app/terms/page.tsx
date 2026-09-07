import Link from "next/link";

export const metadata = {
  title: "Kullanım Şartları — HilmanAI",
  description: "HilmanAI kullanım şartları.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200">
      <div className="max-w-3xl mx-auto px-5 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400 text-xs hover:underline">
          ← HilmanAI&apos;ya dön
        </Link>
        <h1 className="text-2xl font-bold text-white">Kullanım Şartları</h1>
        <p className="text-slate-400">Son güncelleme: 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">1. Hizmet</h2>
          <p>
            HilmanAI, metin sohbeti, kodlama yardımı, görsel analizi, görsel ve video üretimi
            sunan deneysel (beta) bir yapay zeka platformudur. Yanıtlar hatalı olabilir;
            kritik kararlar öncesi doğrulayın.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">2. Hesap ve Erişim</h2>
          <p>
            Hizmeti kullanmak için Google hesabınızla giriş yapmanız gerekir. Hesabınızın
            güvenliğinden siz sorumlusunuz. API anahtarlarınızı kimseyle paylaşmayın.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">3. Yasaklı Kullanım</h2>
          <p>
            Yasa dışı içerik üretimi, başkalarının haklarını ihlal, spam, hizmeti kötüye
            kullanma ve tersine mühendislikle güvenlik atlatma yasaktır. İhlalde erişiminiz
            kısıtlanabilir.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">4. Sorumluluk</h2>
          <p>
            Hizmet &quot;olduğu gibi&quot; sunulur; kesintisiz çalışma garantisi verilmez.
            Üretilen içeriklerin kullanım sorumluluğu kullanıcıya aittir.
          </p>
        </section>
      </div>
    </div>
  );
}
