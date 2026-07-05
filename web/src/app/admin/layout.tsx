export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm-gray-50">
      <nav className="border-b border-warm-gray-200 bg-evergreen-dark px-6 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href="/admin"
              className="font-display text-lg font-bold text-white"
            >
              HTE Admin
            </a>
            <a
              href="/admin"
              className="text-sm text-sand-dark hover:text-white"
            >
              Dashboard
            </a>
          </div>
          <a href="/" className="text-sm text-sand-dark hover:text-white">
            View Site
          </a>
        </div>
      </nav>
      <div className="mx-auto max-w-[1200px] px-6 py-8">{children}</div>
    </div>
  );
}
