import { TextareaAutosizeProps } from 'react-textarea-autosize';

import { ColorNames } from '@common/types/styles';
import { ClassNamedComponent, UnderlinedInput } from '@common/types/components';

export interface Props
  extends UnderlinedInput,
    ClassNamedComponent,
    TextareaAutosizeProps {
  background?: ColorNames;
  heightFitsContent?: boolean;
}
