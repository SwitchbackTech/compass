import { useEffect } from "react";
import { theme } from "@web/common/styles/theme";
import { InfoIcon } from "@web/components/Icons/Info";
import { StyledXIcon } from "@web/components/Icons/X";

const STORAGE_INFO_SEEN_KEY = "compass.day.storage-info-seen";

interface StorageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageInfoModal = ({
  isOpen,
  onClose,
}: StorageInfoModalProps) => {
  useEffect(() => {
    if (isOpen) {
      // Mark as seen when modal is opened
      localStorage.setItem(STORAGE_INFO_SEEN_KEY, "true");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-info-title"
    >
      <button
        className="fixed inset-0 z-0 bg-black"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        aria-label="Close modal"
        tabIndex={-1}
      />
      <div className="bg-darkBlue-400 relative z-10 mx-4 w-full max-w-lg rounded-lg border border-gray-400/20 p-6 text-white shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 transition-colors hover:bg-white/10"
          aria-label="Close storage information"
        >
          <StyledXIcon size={20} color={theme.color.text.light} />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <InfoIcon size={24} color={theme.color.text.light} />
          <h2
            id="storage-info-title"
            className="text-xl font-semibold text-white"
          >
            Browser Storage
          </h2>
        </div>

        <div className="space-y-3 text-sm text-gray-200">
          <p>
            Day tasks are saved in your browser&apos;s local storage. Clearing
            your browser data will remove them.
          </p>
          <p>
            <strong>Your calendar events are safely backed up</strong> and not
            stored in localStorage.
          </p>
          <p>
            Think of day tasks as simple ways to stay focused on today.
            We&apos;ll add cloud backup for tasks soon.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors duration-200 hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const hasSeenStorageInfo = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(STORAGE_INFO_SEEN_KEY) === "true";
};
