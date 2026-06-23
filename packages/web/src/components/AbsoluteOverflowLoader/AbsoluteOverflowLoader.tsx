import {
  AlignItems,
  Flex,
  type FlexProps,
  JustifyContent,
} from "@web/components/Flex/Flex";

export const AbsoluteOverflowLoader = (props: FlexProps) => (
  <Flex
    className="c-overflow-loader"
    justifyContent={JustifyContent.CENTER}
    alignItems={AlignItems.CENTER}
    {...props}
  >
    <div className="c-loader-spinner" />
  </Flex>
);
