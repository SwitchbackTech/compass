import { createElement, forwardRef } from "react";

const SvgrMock = forwardRef(function SvgrMock(props, ref) {
  return createElement("span", { ...props, ref });
});

export const ReactComponent = SvgrMock;
export default SvgrMock;
