export function Footer() {
  return (
    <footer className="bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/scrappy-mascot.png"
            alt="Scrappy"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-lg font-bold text-white">Scrappr</span>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} Scrappr. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">Connecting neighborhoods with scrap haulers</p>
        </div>
      </div>
    </footer>
  );
}
