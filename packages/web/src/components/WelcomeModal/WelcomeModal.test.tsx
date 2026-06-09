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

const { WelcomeModal, STORAGE_KEY } =
	require("./WelcomeModal") as typeof import("./WelcomeModal");

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
		expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
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
		expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
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
		expect(answer).toHaveAttribute("inert");

		await user.click(questionButton);

		expect(questionButton).toHaveAttribute("aria-expanded", "true");
		expect(answer).toHaveAttribute("aria-hidden", "false");
		expect(answer).toHaveAttribute("data-state", "open");
		expect(answer).not.toHaveAttribute("inert");
		expect(
			screen.getByText(
				/Compass is designed for minimalists who value efficiency/,
			),
		).toBeTruthy();

		await user.click(questionButton);

		expect(questionButton).toHaveAttribute("aria-expanded", "false");
		expect(answer).toHaveAttribute("aria-hidden", "true");
		expect(answer).toHaveAttribute("data-state", "closed");
		expect(answer).toHaveAttribute("inert");
	});

	it("uses the shared focus ring on modal links and FAQ triggers", async () => {
		const user = userEvent.setup();

		render(<WelcomeModal />);

		const openSourceQuestion = screen.getByRole("button", {
			name: "How much of the code is open-source?",
		});
		expect(openSourceQuestion).toHaveClass("c-focus-ring");

		await user.click(openSourceQuestion);

		expect(
			screen.getByRole("link", { name: "self-hosting guide" }),
		).toHaveClass("c-focus-ring");
		expect(screen.getByRole("link", { name: "X (Twitter)" })).toHaveClass(
			"c-focus-ring",
		);
		expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveClass(
			"c-focus-ring",
		);
		expect(screen.getByRole("link", { name: "GitHub" })).toHaveClass(
			"c-focus-ring",
		);
		expect(screen.getByRole("link", { name: "Privacy" })).toHaveClass(
			"c-focus-ring",
		);
		expect(screen.getByRole("link", { name: "Terms" })).toHaveClass(
			"c-focus-ring",
		);
	});
});
