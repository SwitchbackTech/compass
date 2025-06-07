import { toast } from "react-toastify";

type Toast_Args = Parameters<typeof toast>;
export const customToast = (
  content: Toast_Args[0],
  options: Toast_Args[1] & { preventDuplicate?: boolean } = {
    preventDuplicate: false,
  },
) => {
  if (!options.toastId && options.preventDuplicate) {
    options.toastId = window.btoa(JSON.stringify(content));
  }
  if (!toast.isActive(options?.toastId || "") || !options.preventDuplicate) {
    toast(content, options);
  }
};
