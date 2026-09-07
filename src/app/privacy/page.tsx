import Link from "next/link";

export const metadata = {
  title: "Gizlilik Politikası — HilmanAI",
  description: "HilmanAI gizlilik politikası: verileriniz nasıl işlenir.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200">
      <div className="max-w-3xl mx-auto px-5 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400 text-xs hover:underline">
          ← HilmanAI&apos;ya dön
        </Link>
        <h1 className="text-2xl font-bold text-white">Gizlilik Politikası</h1>
        <p className="text-slate-400">Son güncelleme: 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">1. Toplanan Veriler</h2>
          <p>
            Google ile giriş yaptığınızda adınız, e-posta adresiniz ve profil fotoğrafınız
            (Google&apos;ın paylaştığı temel profil bilgileri) hesabınızı oluşturmak için alınır.
            Sohbet mesajlarınız, yalnızca size ait geçmişi göstermek amacıyla saklanır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">2. Verilerin Kullanımı</h2>
          <p>
            Verileriniz yalnızca hizmeti sunmak için kullanılır: oturum açma, sohbet geçmişinizi
            size gösterme ve (isteğe bağlı oluşturduğunuz) geliştirici API anahtarlarınızı yönetme.
            Verileriniz üçüncü taraflara satılmaz veya reklam amacıyla paylaşılmaz.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">3. Veri Güvenliği ve Gizlilik</h2>
          <p>
            Her kullanıcının sohbet geçmişi kendi Google hesabına bağlıdır; başka kullanıcılar
            (admin dahil içerik denetimi dışında) geçmişinizi göremez. Oturum bilgileri imzalı,
            httpOnly çerezlerle korunur.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">4. Veri Silme</h2>
          <p>
            Sohbetlerinizi uygulama içinden tek tek veya toplu olarak silebilirsiniz.
            Hesabınızın tamamen silinmesini isterseniz yöneticiyle iletişime geçin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-white">5. İletişim</h2>
          <p>Gizlilikle ilgili sorularınız için uygulama içi destek kanallarını kullanın.</p>
        </section>
      </div>
    </div>
  );
}
