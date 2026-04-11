interface PhoneSharingFieldProps {
  sharePhone: boolean;
  phone: string;
  invalid: boolean;
  showError: boolean;
  onShareChange: (value: boolean) => void;
  onPhoneChange: (value: string) => void;
}

/**
 * Opt-in checkbox + conditional phone input shared between CreateListing and
 * EditListing. The phone is only revealed to the hauler after they claim the
 * listing — mirrors the address privacy pattern.
 */
export function PhoneSharingField({
  sharePhone,
  phone,
  invalid,
  showError,
  onShareChange,
  onPhoneChange,
}: PhoneSharingFieldProps) {
  return (
    <div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sharePhone}
          onChange={(e) => onShareChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          data-testid="share-phone-checkbox"
        />
        <span className="text-sm">
          <span className="font-medium text-gray-700">Share my phone number with the hauler</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Your phone stays private until someone claims this listing — just like your address.
          </span>
        </span>
      </label>
      {sharePhone && (
        <div className="mt-3">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(612) 555-1234"
            className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              showError && invalid ? "border-red-300" : "border-gray-300"
            }`}
            data-testid="phone-input"
          />
          {showError && invalid && (
            <p className="text-xs text-red-600 mt-1">Enter a valid 10-digit US phone number.</p>
          )}
        </div>
      )}
    </div>
  );
}
