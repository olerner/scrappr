import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { BLOCKED_CATEGORIES, CATEGORIES, PREP_CHECKLIST_CATEGORIES } from "../data/mockData";
import type { BlockedCategory, Category } from "../data/types";
import { CategoryIcon } from "./CategoryIcon";

export function CategorySelector({
  selected,
  onSelect,
  showRequired,
}: {
  selected: Category | "";
  onSelect: (category: Category | "") => void;
  showRequired?: boolean;
}) {
  const [showBlocked, setShowBlocked] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const handleSelect = (cat: string) => {
    if (BLOCKED_CATEGORIES.includes(cat as BlockedCategory)) {
      setShowBlocked(cat);
      onSelect("");
      return;
    }
    setShowBlocked(null);
    onSelect(cat as Category);
    setShowChecklist(PREP_CHECKLIST_CATEGORIES.includes(cat as Category));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Category
        {showRequired && !selected && (
          <span className="text-red-500 ml-2 font-normal">Required</span>
        )}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.filter((c) => c.name !== "Electronics").map((cat) => (
          <button
            type="button"
            key={cat.name}
            onClick={() => handleSelect(cat.name)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
              selected === cat.name
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50"
            }`}
            data-testid={`category-${cat.name.toLowerCase()}`}
          >
            <CategoryIcon
              category={cat.name}
              size={20}
              className={selected === cat.name ? "text-emerald-600" : "text-gray-400"}
            />
            {cat.displayName ?? cat.name}
          </button>
        ))}
      </div>

      {/* Blocked categories */}
      <div className="mt-3">
        <p className="text-xs text-gray-400 mb-1.5">Restricted items:</p>
        <div className="flex flex-wrap gap-1.5">
          {BLOCKED_CATEGORIES.map((bc) => (
            <button
              type="button"
              key={bc}
              onClick={() => handleSelect(bc)}
              className="px-2.5 py-1 text-xs bg-red-50 text-red-400 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
            >
              {bc}
            </button>
          ))}
        </div>
      </div>

      {showBlocked && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{showBlocked} not accepted</p>
            <p className="text-xs text-red-500 mt-0.5">
              This item requires special disposal. Please contact your local waste management
              service or visit your county's hazardous waste site for safe recycling options.
            </p>
          </div>
        </div>
      )}

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
  );
}
