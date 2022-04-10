import { TextareaAutosizeProps } from "react-textarea-autosize";
import { ColorNames } from "@web/common/types/styles";
import {
  ClassNamedComponent,
  UnderlinedInput,
} from "@web/common/types/components";

export interface Props
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  background?: ColorNames;
  heightFitsContent?: boolean;
}
