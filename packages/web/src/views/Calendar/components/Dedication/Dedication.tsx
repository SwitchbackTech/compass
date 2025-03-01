import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import Modal from "react-modal";
import derekImg from "@web/assets/png/derek.png";
import { Flex } from "@web/components/Flex";
import { FlexDirections, JustifyContent } from "@web/components/Flex/styled";
import { StyledXIcon } from "@web/components/Icons/X";
import {
  StyledCaption,
  StyledDedicationText,
  StyledDerekPic,
  StyledDerekQuote,
  StyledDerekQuoteContainer,
  modalStyles,
} from "./styled";

export const Dedication = () => {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys("ctrl+shift+0", () => {
    setIsOpen(!isOpen);
  });

  const close = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Modal
        appElement={document.getElementById("root")}
        isOpen={isOpen}
        onRequestClose={close}
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
        shouldFocusAfterRender={true}
        style={modalStyles}
      >
        <Flex
          direction={FlexDirections.ROW}
          justifyContent={JustifyContent.SPACE_BETWEEN}
        >
          <h2>For Derek</h2>
          <StyledXIcon onClick={close} />
        </Flex>
        <StyledDedicationText>
          This app is dedicated to Derek John Benton (1993-2014).
        </StyledDedicationText>

        <StyledDerekQuoteContainer>
          <StyledDerekQuote>
            "I have such amazing friends and family and I wish I could slow down
            time just a little bit so I can take all these relationships in as
            much as possible. Time is the biggest enemy we all face."
            <StyledCaption>
              -Derek's Facebook post from 12.24.2013
            </StyledCaption>
          </StyledDerekQuote>
          <StyledDerekPic src={derekImg} alt="Headshot of Derek" />
        </StyledDerekQuoteContainer>
      </Modal>
    </>
  );
};
