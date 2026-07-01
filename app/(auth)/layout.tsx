import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex flex-col bg-gradient-brand p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Termcatch</span>
        </Link>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center relative z-10 mt-8">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed text-white/90">
              "Termcatch zmienił sposób, w jaki prowadzę swój salon. Moi klienci
              mogą rezerwować o każdej porze, a ja mam wszystko pod kontrolą."
            </p>
            <footer>
              <div className="flex items-center gap-3 mt-6">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                  AK
                </div>
                <div>
                  <p className="font-medium text-sm">Anna Kowalska</p>
                  <p className="text-xs text-white/70">Studio Piękna Magia, Kraków</p>
                </div>
              </div>
            </footer>
          </blockquote>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-16">
            {[
              { value: "12,000+", label: "Salonów" },
              { value: "500K+", label: "Rezerwacji" },
              { value: "4.9★", label: "Ocena" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-white/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-surface-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 mb-10 lg:hidden"
          >
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <span className="text-lg font-semibold text-surface-900 dark:text-white">
              Termcatch
            </span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
