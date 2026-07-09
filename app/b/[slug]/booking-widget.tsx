"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDuration } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  discountedPrice: number | null;
}

interface BookingWidgetProps {
  slug: string;
  services: Service[];
}

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.80)",
  backdropFilter: "blur(28px) saturate(190%)",
  WebkitBackdropFilter: "blur(28px) saturate(190%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.35), 0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(100,116,139,0.09), inset 0 1px 0 rgba(255,255,255,0.95)",
};

const PANEL: React.CSSProperties = {
  background: "rgba(248,250,252,0.85)",
  border: "1px solid rgba(203,213,225,0.45)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
};

export default function BookingWidget({ slug, services }: BookingWidgetProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id ?? ""
  );

  const selected = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="rounded-2xl p-5" style={CARD}>
      <h2 className="text-base font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.015em" }}>
        Zarezerwuj wizytę
      </h2>

      {services.length === 0 ? (
        <p className="text-sm text-slate-500">Ten salon nie ma dostępnych usług.</p>
      ) : (
        <div className="space-y-4">
          {/* Service selector */}
          <div>
            <label htmlFor="widget-service" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Wybierz usługę
            </label>
            <div className="relative">
              <select
                id="widget-service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="input-glass w-full appearance-none rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none pr-8 transition-shadow"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Selected service details */}
          {selected && (
            <div className="rounded-xl p-3.5 space-y-2" style={PANEL}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Czas trwania</span>
                <span className="font-medium text-slate-900">
                  {formatDuration(selected.duration)}
                </span>
              </div>
              <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Cena</span>
                <div className="text-right">
                  {selected.discountedPrice ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        {formatCurrency(selected.price)}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(selected.discountedPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(selected.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/b/${slug}/book?serviceId=${selectedServiceId}`}
            className="btn-spring block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: INK,
              border: "1px solid #0F172A",
              color: "#F8FAFC",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Wybierz termin
          </Link>

          <p className="text-center text-xs text-slate-500">
            Potwierdzenie otrzymasz e-mailem
          </p>
        </div>
      )}
    </div>
  );
}
