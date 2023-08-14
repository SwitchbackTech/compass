import React, { useState } from "react";
import Modal from "react-modal";
import { useHotkeys } from "react-hotkeys-hook";
import { colorNameByPriority } from "@core/constants/colors";
import { Button } from "@web/components/Button";
import derekImg from "@web/assets/png/derek.png";

import {
  StyledCaption,
  StyledDedicationModal,
  StyledDedicationText,
  StyledDerekPic,
  StyledDerekQuote,
  StyledDerekQuoteContainer,
  modalStyles,
} from "./styled";

export const Dedication = () => {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys(
    "ctrl+shift+0",
    () => {
      setIsOpen(!isOpen);
    },
    {
      keydown: true,
    }
  );

  const close = () => {
    setIsOpen(false);
  };

  return (
    <StyledDedicationModal>
      <Modal
        appElement={document.getElementById("root")}
        isOpen={isOpen}
        onRequestClose={close}
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
        shouldFocusAfterRender={true}
        style={modalStyles}
      >
        <h2>For Derek</h2>
        <StyledDedicationText>
          This app is dedicated to Derek John Benton (1993-2014).
        </StyledDedicationText>

        <StyledDerekQuoteContainer>
          <StyledDerekQuote>
            "I have such amazing friends and family and I wish I could slow down
            time just a little bit so I can take all these relationships in as
            much as possible. Time is the biggest enemy we all face."
          </StyledDerekQuote>
          <StyledDerekPic src={derekImg} alt="Headshot of Derek" />
        </StyledDerekQuoteContainer>
        <StyledCaption>-Derek's Facebook post from 12.24.2013</StyledCaption>

        <Button color={colorNameByPriority.work} onClick={close}>
          Close
        </Button>
      </Modal>
    </StyledDedicationModal>
  );
};
