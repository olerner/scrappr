import { useState, useRef } from 'react';
import {
  Plus,
  X,
  Upload,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryIcon } from '../components/CategoryIcon';
import { StatusBadge } from '../components/StatusBadge';
import { CATEGORIES, BLOCKED_CATEGORIES, PREP_CHECKLIST_CATEGORIES } from '../data/mockData';
import type { Category, Listing } from '../data/types';

export function ScrappeeDashboard() {
  const { listings, addListing } = useStore();
  const [showModal, setShowModal] = useState(false);
  const myListings = listings; // In a real app, filter by user

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your scrap metal listings</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            New Listing
          </button>
        </div>

        {/* Listings */}
        {myListings.length === 0 ? (
          <EmptyState onNewListing={() => setShowModal(true)} />
        ) : (
          <div className="grid gap-4">
            {myListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {/* New Listing Modal */}
      {showModal && (
        <NewListingModal
          onClose={() => setShowModal(false)}
          onSubmit={(listing) => {
            addListing(listing);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onNewListing }: { onNewListing: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ImageIcon size={32} className="text-emerald-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Got scrap metal lying around? List it for free and a local hauler will pick it up.
      </p>
      <button
        onClick={onNewListing}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
      >
        <Plus size={18} />
        Create Your First Listing
      </button>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={listing.photoUrl} alt={listing.category} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={listing.category} size={16} className="text-emerald-600" />
              <span className="font-semibold text-gray-900 text-sm">{listing.category}</span>
            </div>
            <StatusBadge status={listing.status} />
          </div>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{listing.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Posted {listing.datePosted}</span>
            {listing.claimedBy && (
              <span className="text-yellow-600 font-medium">Hauler: {listing.claimedBy}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewListingModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (listing: Listing) => void;
}) {
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCategorySelect = (cat: string) => {
    // Check if blocked
    if (BLOCKED_CATEGORIES.includes(cat as any)) {
      setShowBlocked(cat);
      setCategory('');
      return;
    }
    setShowBlocked(null);
    setCategory(cat as Category);
    if (PREP_CHECKLIST_CATEGORIES.includes(cat)) {
      setShowChecklist(true);
    } else {
      setShowChecklist(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!category || !description) return;
    const newListing: Listing = {
      id: Date.now().toString(),
      category: category as Category,
      description,
      photoUrl: photoPreview || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&h=200&fit=crop',
      lat: 44.96 + (Math.random() - 0.5) * 0.05,
      lng: -93.22 + (Math.random() - 0.5) * 0.1,
      address: address || 'Minneapolis, MN',
      status: 'available',
      datePosted: new Date().toISOString().split('T')[0],
      estimatedValue: CATEGORIES.find((c) => c.name === category)?.payoutLabel || 'Varies',
    };
    onSubmit(newListing);
  };

  const selectableCategories = [
    ...CATEGORIES.map((c) => c.name),
    'Refrigerators', 'Freezers', 'Dehumidifiers', 'Microwaves', 'Propane tanks', 'E-waste', 'Tires',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">New Listing</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {photoPreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload a photo</span>
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.filter(c => c.name !== 'Electronics').map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                    category === cat.name
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <CategoryIcon category={cat.name} size={20} className={category === cat.name ? 'text-emerald-600' : 'text-gray-400'} />
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Blocked categories section */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1.5">Restricted items:</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCKED_CATEGORIES.map((bc) => (
                  <button
                    key={bc}
                    onClick={() => handleCategorySelect(bc)}
                    className="px-2.5 py-1 text-xs bg-red-50 text-red-400 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    {bc}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked Message */}
            {showBlocked && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">{showBlocked} not accepted</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    This item requires special disposal. Please contact your local waste management service or visit
                    your county's hazardous waste site for safe recycling options.
                  </p>
                </div>
              </div>
            )}

            {/* Prep Checklist */}
            {showChecklist && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <ClipboardCheck size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Prep checklist</p>
                  <ul className="mt-1 space-y-1">
                    <li className="flex items-center gap-1.5 text-xs text-amber-600">
                      <CheckCircle2 size={12} /> Drain all fluids before pickup
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the metal type, approximate weight, and condition..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address or use current location"
                className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleSubmit}
            disabled={!category || !description}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            Post Listing
          </button>
        </div>
      </div>
    </div>
  );
}
