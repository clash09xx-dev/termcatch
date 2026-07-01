import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";

export default async function AiPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const features = [
    {
      title: "Prognoza przychodów",
      desc: "AI analizuje historię wizyt i przewiduje przychody na kolejne tygodnie.",
    },
    {
      title: "Kampanie do uśpionych klientów",
      desc: "Automatycznie identyfikuj klientów, którzy dawno nie byli — i wyślij im ofertę.",
    },
    {
      title: "Optymalizacja harmonogramu",
      desc: "Rekomendacje dotyczące godzin pracy, które maksymalizują zapełnienie kalendarza.",
    },
    {
      title: "Analiza opinii",
      desc: "AI przetwarza opinie klientów i wskazuje obszary do poprawy.",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-gray-900">AI Asystent</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full">Wkrótce</span>
          </div>
          <p className="text-sm text-gray-500">Inteligentne sugestie dla Twojego salonu</p>
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-gray-900 rounded-2xl p-8 text-white">
        <div className="max-w-lg">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-3">AI dla Twojego salonu</h3>
          <p className="text-white/60 leading-relaxed mb-6">
            Termcatch AI analizuje Twoje dane — wizyty, klientów, przychody — i dostarcza
            konkretne sugestie jak rozwijać biznes. Wkrótce dostępne w planie Pro.
          </p>
          <button className="px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors opacity-60 cursor-not-allowed">
            Dołącz do listy oczekujących
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 mb-4">
              {`0${i + 1}`}
            </div>
            <h4 className="font-semibold text-gray-900 mb-1.5">{f.title}</h4>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
