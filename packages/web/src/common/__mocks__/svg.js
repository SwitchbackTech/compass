import React from "react";

/* 
Supports SVGr mocking for Jest / React Testing Library
    Reference: https://github.com/gregberge/svgr/issues/83
*/

const SvgrMock = React.forwardRef((props, ref) => (
  <span ref={ref} {...props} />
));

export const ReactComponent = SvgrMock;
export default SvgrMock;
