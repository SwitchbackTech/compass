interface ClassNames {
  [className: string]: string;
}
const classNames: ClassNames;
declare module "*.scss" {
  export = classNames;
}
declare module "*.scss" {
  export = classNames;
}

const imageUrl: string;
declare module "*.png" {
  export = imageUrl;
}

declare module "*.svg" {
  import * as React from "react";

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

  export default ReactComponent;
}

declare module "*.jpg" {
  export = imageUrl;
}

declare module "*.jpeg" {
  export = imageUrl;
}
