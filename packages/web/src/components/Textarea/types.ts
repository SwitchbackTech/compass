import { TextareaAutosizeProps } from "react-textarea-autosize";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/component.types";

export interface TextareaProps
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  heightFitsContent?: boolean;
}
