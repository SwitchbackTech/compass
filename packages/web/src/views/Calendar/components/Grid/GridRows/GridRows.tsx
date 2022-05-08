import React from "react";
import { useDrop } from "react-dnd";
import { getHourLabels } from "@web/common/utils/date.utils";
import { DragItem, DropResult } from "@web/common/types/dnd.types";

import { StyledGridRows, StyledGridRow } from "./styled";

export const GridRows = () => {
  const _onDrop = (result: DropResult) => {
    // const delta = monitor.getDifferenceFromInitialOffset() as {
    // x: number;
    // y: number;
    // };

    // const left = Math.round(item.left + delta.x);
    // const top = Math.round(item.top + delta.y);
    // console.log(delta);
    // console.log(`${left} | ${top}`);

    const updatedFields = {
      isSomeday: false,
      startDate: "2022-05-03T19:00:00-05:00",
      endDate: "2022-05-03T21:00:00-05:00",
    };
    console.log(result);

    // dispatch(
    //   getFutureEventsSlice.actions.convert({
    //     _id: result._id,
    //     updatedFields,
    //   })
    // );
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      drop: () => console.log("dropped onto a GridRow"),
      hover: (monitor) => console.log("hovering"),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    []
  );

  /* <div ref={drop}> //TEMP DELETE $$
          <div style={{ backgroundColor: isOver ? "red" : "blue" }}>
            <Text colorName={ColorNames.WHITE_1} size={25}>
              {canDrop ? "Drop here" : "Pick up an event"}
            </Text>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Text colorName={ColorNames.WHITE_1} size={25}>
              {canDrop ? "Or here" : "What you waitin for?"}
            </Text>
          </div>
        </div> */

  return (
    <StyledGridRows ref={drop}>
      {getHourLabels().map((dayTime, index) => (
        <StyledGridRow key={`${dayTime}-${index}:dayTimes`} />
      ))}
    </StyledGridRows>
  );
};
