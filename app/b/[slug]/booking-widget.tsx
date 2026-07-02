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

export default function BookingWidget({ slug, services }: BookingWidgetProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id ?? ""
  );

  const selected = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-soft p-5">
      <h2 className="text-base font-bold text-gray-900 mb-4">Zarezerwuj wizytę</h2>

      {services.length === 0 ? (
        <p className="text-sm text-gray-500">Ten salon nie ma dostępnych usług.</p>
      ) : (
        <div className="space-y-4">
          {/* Service selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Wybierz usługę
            </label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 pr-8"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Selected service details */}
          {selected && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Czas trwania</span>
                <span className="font-medium text-gray-900">
                  {formatDuration(selected.duration)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Cena</span>
                <div className="text-right">
                  {selected.discountedPrice ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(selected.price)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selected.discountedPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-900">
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
            className="block w-full text-center px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Wybierz termin
          </Link>

          <p className="text-center text-xs text-gray-400">
            Potwierdzenie otrzymasz e-mailem
          </p>
        </div>
      )}
    </div>
  );
}
