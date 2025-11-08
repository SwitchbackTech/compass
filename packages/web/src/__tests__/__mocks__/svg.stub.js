import { forwardRef } from "react";

/* 
Supports SVGr mocking for Jest / React Testing Library
    Reference: https://github.com/gregberge/svgr/issues/83
*/

const SvgrMock = forwardRef((props, ref) => <span ref={ref} {...props} />);

SvgrMock.name = "SvgrMock";
export const ReactComponent = SvgrMock;
export default SvgrMock;
