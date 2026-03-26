import {
  ArrowRight,
  Camera,
  CheckCircle,
  ImageIcon,
  MapPin,
  MessageSquare,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MapView } from "../components/MapView";
import { useStore } from "../store/useStore";

export function LandingPage() {
  const listings = useStore((s) => s.listings);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Scrap Metal Pickups Near You
          </h1>
          <p className="text-gray-500 mb-6">
            See what's being recycled in your neighborhood and list your own items for pickup.
          </p>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-gray-200 mb-8">
            <MapView listings={listings} className="h-[250px] md:h-[350px] w-full" />
          </div>

          <div className="text-center space-y-3">
            <Link
              to="/list"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md"
            >
              List Your Scrap <ArrowRight size={18} />
            </Link>
            <div>
              <Link
                to="/haul"
                className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-600 text-emerald-700 font-semibold rounded-full hover:bg-emerald-50 transition-all"
              >
                Start Hauling <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New Photo-Based Listings */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">
            New Photo-Based Listings
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Feature
              icon={<ImageIcon size={28} className="text-emerald-600" />}
              title="Photo Uploads"
              desc="Upload photos of your scrap metal to help haulers identify items"
            />
            <Feature
              icon={<MessageSquare size={28} className="text-emerald-600" />}
              title="Hauler Claims"
              desc="Get notified when a hauler claims your listing and is on the way"
            />
            <Feature
              icon={<CheckCircle size={28} className="text-emerald-600" />}
              title="Pickup Confirmation"
              desc="Haulers confirm pickups for a seamless recycling experience"
            />
          </div>
        </div>
      </section>

      {/* Meet Scrappy */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Turn Your Scrap Metal into Cash
        </h2>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
          Scrappr connects neighborhood residents with local scrap metal haulers. List your items,
          get them picked up, and help the environment!
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden max-w-md mx-auto">
          <div className="bg-emerald-100 p-6 flex items-center justify-center">
            <img
              src="/scrappy-mascot.png"
              alt="Scrappy the dog mascot"
              className="w-48 h-48 object-cover rounded-xl"
            />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Meet Scrappy!</h3>
            <p className="text-gray-500 text-sm">
              Our friendly mascot who helps turn your unwanted metal items into recycling gold!
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 text-center">
            <Feature
              icon={<Phone size={28} className="text-emerald-600" />}
              title="Simple Verification"
              desc="Quick phone number verification to get you started in seconds"
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 text-center">
            <Feature
              icon={<MapPin size={28} className="text-emerald-600" />}
              title="Location Services"
              desc="Enter your address so haulers can find your listing nearby"
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 text-center">
            <Feature
              icon={<Camera size={28} className="text-emerald-600" />}
              title="Photo Uploads"
              desc="Take photos of your items to help haulers identify your scrap"
            />
          </div>
        </div>
      </section>

      {/* What Can Be Picked Up */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
          What Can Be Picked Up?
        </h2>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Accepted */}
            <div>
              <h3 className="text-emerald-600 font-semibold mb-4">Accepted Items</h3>
              <ul className="space-y-2">
                {[
                  "Copper (pipes, wiring, tubing)",
                  "Aluminum (cans, siding, gutters)",
                  "Brass (fixtures, valves, keys)",
                  "Steel (appliances, car parts)",
                  "Iron (cast iron, wrought iron)",
                  "Electronic Scrap (computers, wiring)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500 mt-0.5">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Not Accepted */}
            <div>
              <h3 className="text-red-500 font-semibold mb-4">Not Accepted</h3>
              <ul className="space-y-2">
                {[
                  "Hazardous Materials",
                  "Refrigerants (unless properly removed)",
                  "Contaminated Items",
                  "Radioactive Materials",
                  "Combustible Materials",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-0.5">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
            <p className="text-gray-400 text-xs">&copy; 2023 Scrappr. All rights reserved.</p>
            <p className="text-gray-500 text-xs">Connecting neighborhoods with scrap haulers</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm max-w-xs">{desc}</p>
    </div>
  );
}
