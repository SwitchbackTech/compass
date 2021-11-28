import React, {
  ForwardedRef,
  forwardRef,
  ForwardRefRenderFunction,
  RefObject,
  useRef,
} from 'react';

import { FocusableUnderlineLayout } from '@components/FocusableUnderlinedComponent';

import { Styled } from './styled';
import { Props } from './types';

const Component: ForwardRefRenderFunction<HTMLTextAreaElement, Props> = (
  { withUnderline = true, ...props }: Props,
  parentRef: ForwardedRef<HTMLTextAreaElement>
) => {
  const ref = (parentRef ||
    useRef<HTMLTextAreaElement>(null)) as RefObject<HTMLTextAreaElement>;

  return (
    <FocusableUnderlineLayout
      Component={Styled}
      withUnderline={withUnderline}
      {...props}
      ref={ref}
    />
  );
};

export const Textarea = forwardRef(Component);
