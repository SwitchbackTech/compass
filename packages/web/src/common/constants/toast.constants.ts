import { ToastOptions } from "react-toastify";
import { c } from "@web/common/styles/colors";
import { theme } from "@web/common/styles/theme";

export const toastDefaultOptions: ToastOptions = {
  autoClose: 5000,
  position: "bottom-left",
  closeOnClick: true,
  theme: "dark",
  style: {
    backgroundColor: theme.color.bg.primary,
    color: theme.color.text.lighter,
    boxShadow: `0 4px 2px ${c.gray900}, 0 0 10px ${c.blueGray400}`,
  },
  progressStyle: {
    background: `linear-gradient(to right, ${c.blue100}, ${c.blueGray100})`,
  },
};
