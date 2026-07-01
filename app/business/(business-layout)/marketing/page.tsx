import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function MarketingPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const channels = [
    {
      title: "Kampania SMS",
      desc: "Wyślij wiadomość SMS do wybranych klientów. Idealne na promocje i powiadomienia o wolnych terminach.",
      badge: "Wkrótce",
    },
    {
      title: "E-mail marketing",
      desc: "Newsletter do bazy klientów — nowe usługi, sezonowe oferty, przypomnienia.",
      badge: "Wkrótce",
    },
    {
      title: "Link do rezerwacji",
      desc: "Skopiuj link do swojego profilu i umieść go w bio, na Facebook, Instagram lub Google.",
      badge: "Dostępne",
      action: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Marketing</h2>
        <p className="text-sm text-gray-500 mt-1">Docieraj do klientów i wypełniaj kalendarz</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {channels.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                c.action ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {c.badge}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed flex-1">{c.desc}</p>
            {c.action && (
              <button className="mt-5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">
                Skopiuj link
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Stats placeholder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Zasięg organiczny</h3>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Wyświetlenia profilu", value: "—" },
            { label: "Rezerwacje z wyszukiwania", value: "—" },
            { label: "Konwersja", value: "—" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gray-300">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
