import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

export function PhotoUpload({
  file,
  onFileChange,
  error,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setFile = (file: File) => {
    onFileChange(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    onFileChange(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const processDroppedFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setDragError("Images only");
      setTimeout(() => setDragError(null), 2000);
      return;
    }
    setDragError(null);
    setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processDroppedFile(f);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        data-testid="photo-input"
      />
      <div
        data-testid="photo-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
              dragError
                ? "border-red-400 bg-red-50"
                : isDragOver
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50"
            }`}
            data-testid="photo-upload-btn"
          >
            <Upload
              size={24}
              className={
                dragError ? "text-red-400" : isDragOver ? "text-emerald-500" : "text-gray-400"
              }
            />
            <span
              className={`text-sm ${dragError ? "text-red-500 font-medium" : isDragOver ? "text-emerald-600" : "text-gray-500"}`}
            >
              {dragError || (isDragOver ? "Drop your photo here" : "Click or drag to upload a photo")}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">A photo is required to post a listing.</p>
      )}
    </div>
  );
}
