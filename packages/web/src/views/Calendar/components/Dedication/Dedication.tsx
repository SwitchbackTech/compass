import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { XIcon } from "@phosphor-icons/react";
import derekImg from "@web/assets/png/derek.png";

export const Dedication = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useHotkeys("ctrl+shift+0", () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    } else {
      dialogRef.current?.showModal();
    }
  });

  const close = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80"
    >
      <div className="flex h-screen w-screen items-center justify-center">
        <button
          type="button"
          onClick={close}
          className="absolute inset-0 cursor-default"
          aria-label="Close dialog"
        />
        <div className="bg-fg-primary relative w-[59%] rounded p-6 shadow-lg">
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
            <blockquote className="mr-5 text-2xl italic">
              "I have such amazing friends and family and I wish I could slow
              down time just a little bit so I can take all these relationships
              in as much as possible. Time is the biggest enemy we all face."
              <div className="text-s ml-12 pt-8">
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
