import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { SessionExpiredReauthBridge } from "@web/auth/components/SessionExpiredReauthBridge";
import { useConnectGoogle } from "@web/auth/hooks/oauth/useConnectGoogle";
import { SESSION_EXPIRED_REAUTH_EVENT } from "@web/common/utils/toast/error-toast.util";

jest.mock("@web/auth/hooks/oauth/useConnectGoogle");

const mockUseConnectGoogle = useConnectGoogle as jest.MockedFunction<
  typeof useConnectGoogle
>;

describe("SessionExpiredReauthBridge", () => {
  it("triggers Google reconnect when reauth event is dispatched", () => {
    const onConnectGoogleCalendar = jest.fn();
    mockUseConnectGoogle.mockReturnValue({
      isGoogleCalendarConnected: false,
      onConnectGoogleCalendar,
    });

    render(<SessionExpiredReauthBridge />);

    window.dispatchEvent(new Event(SESSION_EXPIRED_REAUTH_EVENT));

    expect(onConnectGoogleCalendar).toHaveBeenCalledTimes(1);
  });
});
