import { TextareaAutosizeProps } from "react-textarea-autosize";
import { ColorNames } from "@core/types/color.types";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/component.types";

export interface TextareaProps
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  background?: ColorNames;
  heightFitsContent?: boolean;
}
