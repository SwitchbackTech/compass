import {
  type ClassNamedComponent,
  type UnderlinedInput,
} from "@web/common/types/component.types";
import { type TextareaAutosizeProps } from "react-textarea-autosize";

export interface TextareaProps
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  heightFitsContent?: boolean;
}
