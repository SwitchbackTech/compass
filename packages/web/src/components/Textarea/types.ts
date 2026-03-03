import { type TextareaAutosizeProps } from "react-textarea-autosize";
import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";

export interface TextareaProps
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  heightFitsContent?: boolean;
}
