import { XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import derekImg from "@web/assets/png/derek.png";
import { useAppHotkey } from "@web/common/hooks/useAppHotkey";

export const Dedication = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const open = () => {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => setIsVisible(true));
  };

  const close = () => {
    setIsVisible(false);
  };

  const handleTransitionEnd = () => {
    if (!isVisible) {
      dialogRef.current?.close();
    }
  };

  useAppHotkey("Control+Shift+0", () => {
    if (dialogRef.current?.open) {
      close();
    } else {
      open();
    }
  });

  useAppHotkey("Escape", () => {
    if (dialogRef.current?.open) {
      close();
    }
  });

  return (
    <dialog
      ref={dialogRef}
      className={`max-h-none max-w-none bg-transparent p-0 transition-[opacity,overlay,display] duration-300 ease-out backdrop:bg-black/80 backdrop:transition-opacity backdrop:duration-300 ${
        isVisible
          ? "opacity-100 backdrop:opacity-100"
          : "opacity-0 backdrop:opacity-0"
      }`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="flex h-screen w-screen items-center justify-center">
        <button
          type="button"
          onClick={close}
          className="absolute inset-0 cursor-default"
          aria-label="Close dialog"
        />
        <div
          className={`bg-fg-primary relative w-[59%] rounded p-6 shadow-lg transition-transform duration-300 ease-out ${
            isVisible ? "scale-100" : "scale-95"
          }`}
        >
          <div className="flex flex-row justify-between">
            <h2>For Derek</h2>
            <button
              type="button"
              onClick={close}
              className="cursor-pointer transition-[filter] duration-200 hover:brightness-150"
            >
              <XIcon size={24} />
            </button>
          </div>
          <p className="text-l">
            This app is dedicated to Derek John Benton (1993-2014).
          </p>
          <div className="flex flex-row items-center justify-center">
            <blockquote className="mr-5">
              <p
                className="text-2xl"
                style={{ fontFamily: '"Caveat", cursive' }}
              >
                "I have such amazing friends and family and I wish I could slow
                down time just a little bit so I can take all these
                relationships in as much as possible. Time is the biggest enemy
                we all face."
              </p>
              <div className="text-s text-text-darkPlaceholder ml-12 pt-8">
                -Derek&apos;s Facebook post from 12.24.2013
              </div>
            </blockquote>
            <img
              src={derekImg}
              alt="Headshot of Derek"
              className="max-w-full rounded-full shadow-[0_0_10px_var(--color-panel-shadow)]"
            />
          </div>
        </div>
      </div>
    </dialog>
  );
};
