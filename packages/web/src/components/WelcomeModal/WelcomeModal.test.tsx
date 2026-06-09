import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CompassSession } from "@web/auth/compass/session/session.types";
import { act, createContext } from "react";

const mockOpenModal = mock();
const SessionContext = createContext<CompassSession>({
	authenticated: false,
	setAuthenticated: mock(),
});

mock.module("@web/auth/compass/session/session.context", () => ({
	SessionContext,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
	useAuthModal: () => ({
		openModal: mockOpenModal,
	}),
}));

const { WelcomeModal } =
	require("./WelcomeModal") as typeof import("./WelcomeModal");
const { STORAGE_KEYS } =
	require("@web/common/constants/storage.constants") as typeof import("@web/common/constants/storage.constants");

describe("WelcomeModal", () => {
	beforeEach(() => {
		localStorage.clear();
		mockOpenModal.mockClear();
	});

	it("closes when the backdrop is clicked", async () => {
		const user = userEvent.setup();

		render(<WelcomeModal />);

		expect(
			screen.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
		).toBeTruthy();

		await user.click(screen.getByRole("presentation"));

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
			).toBeNull();
		});
		expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
	});

	it("closes when Escape is pressed", async () => {
		const user = userEvent.setup();

		render(<WelcomeModal />);

		const backdrop = screen.getByRole("presentation");
		await act(async () => {
			backdrop.focus();
		});

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
			).toBeNull();
		});
		expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
	});

	it("expands and collapses FAQ answers", async () => {
		const user = userEvent.setup();

		render(<WelcomeModal />);

		const questionButton = screen.getByRole("button", {
			name: "Who is Compass for?",
		});
		const answerId = questionButton.getAttribute("aria-controls");
		expect(answerId).toBeTruthy();

		const answer = document.getElementById(answerId as string);
		expect(questionButton).toHaveAttribute("aria-expanded", "false");
		expect(answer).toHaveAttribute("aria-hidden", "true");
		expect(answer).toHaveAttribute("data-state", "closed");

		await user.click(questionButton);

		expect(questionButton).toHaveAttribute("aria-expanded", "true");
		expect(answer).toHaveAttribute("aria-hidden", "false");
		expect(answer).toHaveAttribute("data-state", "open");
		expect(
			screen.getByText(
				/Compass is designed for minimalists who value efficiency/,
			),
		).toBeTruthy();

		await user.click(questionButton);

		expect(questionButton).toHaveAttribute("aria-expanded", "false");
		expect(answer).toHaveAttribute("aria-hidden", "true");
		expect(answer).toHaveAttribute("data-state", "closed");
	});
});
