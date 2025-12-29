import { useEffect, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { InfoIcon } from "@web/components/Icons/Info";
import { StyledXIcon } from "@web/components/Icons/X";
import { markStorageInfoAsSeen } from "../../../../common/utils/storage/storage.util";

interface StorageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageInfoModal = ({
  isOpen,
  onClose,
}: StorageInfoModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Mark as seen when modal is opened
      markStorageInfoAsSeen();

      // Store the currently focused element before opening modal
      previousActiveElementRef.current =
        document.activeElement as HTMLElement | null;

      // Focus the modal container
      if (modalRef.current) {
        const firstFocusableElement = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement | null;
        firstFocusableElement?.focus();
      }
    } else {
      // Restore focus to the previously focused element when modal closes
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Trap focus within modal using Tab key
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        );

        const firstFocusableElement = focusableElements[0] as HTMLElement;
        const lastFocusableElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            e.preventDefault();
            lastFocusableElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusableElement) {
            e.preventDefault();
            firstFocusableElement?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
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
        aria-label="Close modal"
        tabIndex={-1}
      />
      <div
        ref={modalRef}
        className="bg-darkBlue-400 relative z-10 mx-4 w-full max-w-lg rounded-lg border border-gray-400/20 p-6 text-white shadow-lg"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 transition-colors hover:bg-white/10"
          aria-label="Close storage information"
        >
          <StyledXIcon size={20} color={theme.color.text.light} />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <InfoIcon size={18} color={theme.color.text.light} />
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
          <p>Think of day tasks as simple ways to stay focused on today.</p>
          <p>
            <strong>Your calendar events are safely backed up</strong> and not
            stored in your browser.
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
