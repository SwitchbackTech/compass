import { AxiosResponse } from "axios";
import dayjs from "dayjs";
import React, { act } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom/extend-expect";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { setupDraftState } from "@web/__tests__/utils/state/draft.state.util";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { EventApi } from "@web/ducks/events/event.api";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { DraftProvider } from "@web/views/Calendar/components/Draft/context/DraftProvider";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm/SomedayEventForm";

const mockDispatch = jest.fn();
const mockConfirm = jest.spyOn(window, "confirm");
const mockOnClose = jest.fn();
const mockOnMigrate = jest.fn();
const mockOnSubmit = jest.fn();
const mockOnDelete = jest.fn();
const mockSetEvent = jest.fn();
const mockDuplicateEvent = jest.fn();

jest.mock("react-toastify", () => ({ toast: jest.fn() }));

describe("SomedayEventForm Hotkeys", () => {
  beforeEach(() => jest.resetAllMocks());

  jest.spyOn(window, "alert");

  jest
    .spyOn(EventApi, "delete")
    .mockImplementation(() =>
      Promise.resolve({ status: 200 } as unknown as AxiosResponse<void>),
    );

  const sampleSomedayEvent = createMockStandaloneEvent({
    isSomeday: true,
  }) as Schema_Event;

  const now = dayjs();
  const startDate = now.startOf("week").toISOString();
  const endDate = now.endOf("week").toISOString();
  const defaultCategory = Categories_Event.SOMEDAY_WEEK;

  test("should call onSubmit when enter keyboard shortcut is used", async () => {
    const state = setupDraftState(sampleSomedayEvent as Schema_WebEvent);
    const { weekProps, dateCalcs, deleteEvent } = state;

    render(
      <DraftProvider weekProps={weekProps} dateCalcs={dateCalcs} isSidebarOpen>
        <SomedayEventForm
          weekViewRange={{ startDate, endDate }}
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          onDelete={deleteEvent}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
        ,
      </DraftProvider>,
    );

    // Ensure the form is rendered (good sanity check)
    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => {
      await userEvent.keyboard("{Enter}");
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining(sampleSomedayEvent),
    );
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test("should trigger delete flow when delete keyboard shortcut is used and confirmed", async () => {
    // Explicitly confirm deletion
    mockConfirm.mockReturnValue(true);

    const deleteSpy = jest.spyOn(deleteEventSlice.actions, "request");

    const { weekProps, dateCalcs, deleteEvent } = setupDraftState(
      sampleSomedayEvent as Schema_WebEvent,
    );

    render(
      <DraftProvider weekProps={weekProps} dateCalcs={dateCalcs} isSidebarOpen>
        <SomedayEventForm
          weekViewRange={{ startDate, endDate }}
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          onDelete={deleteEvent}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
        ,
      </DraftProvider>,
    );

    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => {
      await userEvent.keyboard("{Delete}");
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith(
      `Delete ${sampleSomedayEvent.title}?`,
    );
    expect(deleteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: sampleSomedayEvent._id!,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test("should not trigger delete flow when delete keyboard shortcut is used and cancelled", async () => {
    // Explicitly refuse deletion
    mockConfirm.mockReturnValue(false);

    const { weekProps, dateCalcs, deleteEvent } = setupDraftState(
      sampleSomedayEvent as Schema_WebEvent,
    );

    render(
      <DraftProvider weekProps={weekProps} dateCalcs={dateCalcs} isSidebarOpen>
        <SomedayEventForm
          weekViewRange={{ startDate, endDate }}
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          onDelete={deleteEvent}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
        ,
      </DraftProvider>,
    );

    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => {
      await userEvent.keyboard("{Delete}");
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith(
      `Delete ${sampleSomedayEvent.title}?`,
    );

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test("should call duplicateEvent when duplicate icon btn is clicked", async () => {
    const user = userEvent.setup();

    const { weekProps, dateCalcs, deleteEvent } = setupDraftState(
      sampleSomedayEvent as Schema_WebEvent,
    );

    render(
      <DraftProvider weekProps={weekProps} dateCalcs={dateCalcs} isSidebarOpen>
        <SomedayEventForm
          weekViewRange={{ startDate, endDate }}
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          onDuplicate={mockDuplicateEvent}
          onDelete={deleteEvent}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
        ,
      </DraftProvider>,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Duplicate Event")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Duplicate Event"));

    expect(mockDuplicateEvent).toHaveBeenCalledTimes(1);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test("should call onMigrate when migrate backward icon btn is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SomedayEventForm
        weekViewRange={{ startDate, endDate }}
        event={sampleSomedayEvent}
        onClose={mockOnClose}
        onMigrate={mockOnMigrate}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
        setEvent={mockSetEvent}
        category={defaultCategory}
      />,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Migrate to previous week")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Migrate to previous week"));

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "back",
    );
  });

  test("should call onMigrate when migrate forward icon btn is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SomedayEventForm
        weekViewRange={{ startDate, endDate }}
        event={sampleSomedayEvent}
        onClose={mockOnClose}
        onMigrate={mockOnMigrate}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
        setEvent={mockSetEvent}
        category={defaultCategory}
      />,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Migrate to next week")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Migrate to next week"));

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "forward",
    );
  });

  /**
   * Test validates that the duplicate shortcut is now implemented
   */
  test("should call duplicateEvent when meta+d keyboard shortcut is used", async () => {
    render(
      <SomedayEventForm
        weekViewRange={{ startDate, endDate }}
        event={sampleSomedayEvent}
        onClose={mockOnClose}
        onMigrate={mockOnMigrate}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
        setEvent={mockSetEvent}
        category={defaultCategory}
      />,
    );

    // Ensure the form is rendered (good sanity check)
    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => userEvent.keyboard("{Meta>}d{/Meta}"));

    expect(mockDuplicateEvent).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test("should call onMigrate when ctrl+meta+left keyboard shortcut is used while ActionsMenu is open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    // Open the actions menu
    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    // Wait for menu to be open
    await waitFor(() => {
      expect(screen.getByText("Migrate to previous week")).toBeInTheDocument();
    });

    // Try the keyboard shortcut while menu is open
    await act(async () => {
      await user.keyboard("{Control>}{Meta>}{ArrowLeft}{/Meta}{/Control}");
    });

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "back",
    );
  });

  test("should call duplicateEvent when meta+d keyboard shortcut is used while ActionsMenu is open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    // Open the actions menu
    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    // Wait for menu to be open
    await waitFor(() => {
      expect(screen.getByText("Duplicate Event")).toBeInTheDocument();
    });

    // Try the keyboard shortcut while menu is open
    await act(async () => {
      await user.keyboard("{Meta>}d{/Meta}");
    });

    expect(mockDuplicateEvent).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("should call onMigrate when ctrl+meta+right keyboard shortcut is used while ActionsMenu is open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    // Open the actions menu
    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    // Wait for menu to be open
    await waitFor(() => {
      expect(screen.getByText("Migrate to next week")).toBeInTheDocument();
    });

    // Try the keyboard shortcut while menu is open
    await act(async () => {
      await user.keyboard("{Control>}{Meta>}{ArrowRight}{/Meta}{/Control}");
    });

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "forward",
    );
  });

  test("should call onDelete when delete keyboard shortcut is used while ActionsMenu is open", async () => {
    const user = userEvent.setup();
    mockConfirm.mockReturnValue(true);

    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    // Open the actions menu
    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    // Wait for menu to be open
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Try the keyboard shortcut while menu is open
    await act(async () => {
      await user.keyboard("{Delete}");
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      getSomedayEventsSlice.actions.delete({ _id: sampleSomedayEvent._id }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
  });
});
