import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  MapPin,
  Recycle,
  Search,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MapView } from "../components/MapView";
import { ScrappyDog } from "../components/ScrappyDog";
import { useStore } from "../store/useStore";

export function LandingPage() {
  const navigate = useNavigate();
  const listings = useStore((s) => s.listings);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <ScrappyDog size={28} />
              <span className="text-emerald-100 text-sm font-medium">
                Meet Scrappy, your recycling sidekick
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
              Your scrap.
              <br />
              Their hustle.
              <br />
              <span className="text-emerald-300">Zero waste.</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto mb-10 leading-relaxed">
              Scrappees list it. Scrapprs pick it up. Scrap yards pay for it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/scrappee")}
                className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                List Scrap for Free
              </button>
              <button
                type="button"
                onClick={() => navigate("/scrappr")}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-all shadow-lg hover:shadow-xl border border-emerald-400 text-lg flex items-center justify-center gap-2"
              >
                <Truck size={20} />
                Start Hauling
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-emerald-900 border-t border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-center justify-center gap-3 text-center md:text-left">
              <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Recycle size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">
                  76% of recyclables never leave the home
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-center md:text-left">
              <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">Copper: $4.80/lb</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-center md:text-left">
              <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-sm">Aluminum cans: $0.65/lb</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Scrap near you</h2>
          <p className="text-gray-500">Real-time listings from the Twin Cities area</p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
          <MapView listings={listings} className="h-[400px] md:h-[500px] w-full" />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">How it works</h2>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* Scrappee Side */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-8">
                <Camera size={16} />
                For Scrappees (Listers)
              </div>
              <div className="space-y-8">
                <Step
                  num={1}
                  icon={<Camera size={24} className="text-emerald-600" />}
                  title="Snap a photo"
                  desc="Take a picture of your scrap metal and post a free listing in seconds."
                />
                <Step
                  num={2}
                  icon={<MapPin size={24} className="text-emerald-600" />}
                  title="Set your location"
                  desc="Drop a pin or use your address so haulers can find your listing nearby."
                />
                <Step
                  num={3}
                  icon={<CheckCircle2 size={24} className="text-emerald-600" />}
                  title="Get it picked up"
                  desc="A local Scrappr claims your listing and hauls it away for free."
                />
              </div>
            </div>

            {/* Scrappr Side */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-8">
                <Truck size={16} />
                For Scrapprs (Haulers)
              </div>
              <div className="space-y-8">
                <Step
                  num={1}
                  icon={<Search size={24} className="text-emerald-600" />}
                  title="Browse the map"
                  desc="Find nearby scrap listings and sort by value, distance, or metal type."
                />
                <Step
                  num={2}
                  icon={<ClipboardList size={24} className="text-emerald-600" />}
                  title="Claim a pickup"
                  desc="Lock in your haul so nobody else grabs it. Plan your route."
                />
                <Step
                  num={3}
                  icon={<DollarSign size={24} className="text-emerald-600" />}
                  title="Get paid at the yard"
                  desc="Deliver to your local scrap yard and earn commodity income on every load."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to turn scrap into cash?</h2>
          <p className="text-emerald-100 mb-8 text-lg">
            Join the circular economy. Whether you have scrap to give or a truck to fill, Scrappr
            connects the dots.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/scrappee")}
              className="px-8 py-3 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              List Scrap for Free <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/scrappr")}
              className="px-8 py-3 bg-emerald-800 text-white font-semibold rounded-xl hover:bg-emerald-900 transition-all flex items-center gap-2"
            >
              Start Hauling <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <ScrappyDog size={32} />
            <span className="text-lg font-bold text-white">Scrappr</span>
          </div>
          <p className="text-emerald-400 text-sm">Your scrap. Their hustle. Zero waste. 🌍</p>
          <p className="text-emerald-600 text-xs">2026 Scrappr. Built for the Twin Cities.</p>
        </div>
      </footer>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">
          Step {num}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
