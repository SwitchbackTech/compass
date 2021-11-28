import React from "react";
import styled, { ThemeProvider } from "styled-components";
import PropTypes from "prop-types";
import theme from "styled-theming";
import { lightTheme, darkTheme } from "./themes";
import GlobalStyle from "./global";
/*
 * Styled Components Demos
 */

const TitleFromProps = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: ${(props) => props.theme.colors.main};
  background-color: ${(props) => props.theme.colors.secondary};
`;

//dynamic color using theme() shorthand
const titleColor = theme("mode", {
  light: "#edabab",
  dark: "#413737ee",
});

const TitleFromTheme = styled.h1`
  color: ${titleColor};
`;

const Wrapper = styled.section`
  padding: 4em;
  background: papayawhip;
`;

const boxBackground = theme("mode", {
  light: lightTheme.colors.main,
  dark: darkTheme.colors.main,
});

const Box = styled.div`
  outline-style: solid;
  color: darkcyan;
`;

//Theming with Variants
const backgroundColor = theme.variants("mode", "variant", {
  default: { light: "gray", dark: "darkgray" },
  primary: { light: "blue", dark: "darkblue" },
  success: { light: "green", dark: "darkgreen" },
  warning: { light: "orange", dark: "darkorange" },
});

const Button = styled.button`
  background-color: ${backgroundColor};
  height: 25px;
  width: 45px;
`;

Button.propTypes = {
  variant: PropTypes.oneOf(["default", "primary", "success", "warning"]),
};

Button.defaultProps = {
  variant: "default",
};

//interface with props
interface Props {
  title: string;
}

const PropsInterface = (props: Props) => {
  return <h1>{props.title}</h1>;
};

const StylesDemo = () => {
  return (
    <>
      <GlobalStyle />
      <ThemeProvider theme={darkTheme}>
        <Wrapper>
          <TitleFromProps>Title from Props</TitleFromProps>
          <Box>
            <p>box paragraph 1</p>
            <p>box paragraph 2</p>
            <p>box paragraph 3</p>
          </Box>
          <Button />
          <Button variant="primary" />
          <Button variant="success" />
          <Button variant="warning" />
          <PropsInterface title="Checkout this interface!" />
          <TitleFromTheme>Title from theme()</TitleFromTheme>
        </Wrapper>
      </ThemeProvider>
    </>
  );
};

export default StylesDemo;
