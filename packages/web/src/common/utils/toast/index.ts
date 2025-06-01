import { toast } from "react-toastify";

type Toast_Args = Parameters<typeof toast>;
export const toastWithoutDuplication = (
  content: Toast_Args[0],
  options: Toast_Args[1] = {},
) => {
  if (!options.toastId) {
    options.toastId = window.btoa(JSON.stringify(content));
  }
  if (!toast.isActive(options.toastId)) {
    toast(content, options);
  }
};
