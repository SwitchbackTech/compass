import {
	LinkedinLogoIcon,
	XLogoIcon,
	GithubLogoIcon,
} from "@phosphor-icons/react";
import { useContext, useState } from "react";
import { SessionContext } from "@web/auth/compass/session/SessionProvider";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const STORAGE_KEY = "compass.onboarding.has-seen-welcome";

function hasSeenWelcome(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return true;
	}
}

function markWelcomeSeen(): void {
	try {
		localStorage.setItem(STORAGE_KEY, "true");
	} catch {
		// Silently fail if localStorage is unavailable
	}
}

const FAQ_ITEMS = [
	{
		question: "Who is Compass for?",
		answer:
			"Compass is designed for minimalists who value efficiency, keyboard shortcuts, and open-source software. We are focused on helping people do more with less.",
	},
	{
		question: "Does Compass use AI?",
		answer:
			"Not currently. Compass gives you the tools to make your own decisions about how to spend your time, without algorithmic suggestions you'll ignore anyway.",
	},
	{
		question: "How much of the code is open-source?",
		answer: null, // rendered separately
	},
	{
		question: "What makes Compass different from other calendars?",
		answer:
			"It's simpler and faster. Instead of doing everything, we do a few things well.",
	},
];

export function WelcomeModal() {
	const { authenticated } = useContext(SessionContext);
	const { openModal } = useAuthModal();
	const [isOpen, setIsOpen] = useState(
		() => !authenticated && !hasSeenWelcome(),
	);

	if (!isOpen) return null;

	const dismiss = () => {
		markWelcomeSeen();
		setIsOpen(false);
	};

	const handleLogIn = () => {
		dismiss();
		openModal("login");
	};

	return (
		<div
			className="fixed inset-0 flex items-center justify-center bg-bg-primary/85 backdrop-blur-sm overflow-y-auto py-8"
			role="presentation"
			style={{ zIndex: Z_INDEX_MODAL }}
		>
			<div
				role="dialog"
				aria-modal
				aria-label="Welcome to Compass Calendar"
				className="w-[560px] max-w-[90vw] flex flex-col gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
			>
				{/* Header */}
				<div className="flex flex-col gap-2">
					<h2 className="m-0 text-2xl font-bold text-text-lighter">
						Ahoy! You found a simple, fast calendar.
					</h2>
					<p className="m-0 text-base text-text-light">
						We&apos;re making Compass Calendar the best place to manage your
						week.
					</p>
				</div>

				{/* Action buttons */}
				<div className="flex gap-3">
					<button
						type="button"
						onClick={dismiss}
						className="h-11 flex-1 rounded bg-accent-primary px-4 text-sm font-medium text-text-dark transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg"
					>
						Start Now
					</button>
					<button
						type="button"
						onClick={handleLogIn}
						className="h-11 flex-1 rounded border border-border-primary bg-panel-badge-bg px-4 text-sm text-text-lighter transition-colors hover:bg-panel-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg"
					>
						Log In
					</button>
				</div>

				{/* FAQ */}
				<div className="flex flex-col divide-y divide-border-primary">
					{FAQ_ITEMS.map((item) => (
						<details key={item.question} className="group py-3">
							<summary className="cursor-pointer list-none text-sm font-medium text-text-lighter select-none hover:text-text-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded">
								{item.question}
							</summary>
							<div className="mt-2 text-sm text-text-light leading-relaxed">
								{item.answer !== null ? (
									item.answer
								) : (
									<>
										All of it! Compass is a monorepo that includes the API,
										frontend, CLI, and more. You can run it yourself too; read
										the{" "}
										<a
											href="/blog/self-host"
											className="font-medium text-accent-primary underline-offset-4 hover:underline"
										>
											self-hosting guide
										</a>{" "}
										to set up your own instance. It&apos;s all available on
										GitHub (link in footer), and we&apos;re always looking for
										contributors :]
									</>
								)}
							</div>
						</details>
					))}
				</div>

				{/* Footer: social + legal */}
				<div className="flex items-center justify-between border-t border-border-primary pt-4">
					<div className="flex items-center gap-3">
						<a
							href="https://x.com/CompassCalendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="X (Twitter)"
							className="text-text-light transition-colors hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
						>
							<XLogoIcon size={18} weight="bold" />
						</a>
						<a
							href="https://www.linkedin.com/company/compass-calendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="LinkedIn"
							className="text-text-light transition-colors hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
						>
							<LinkedinLogoIcon size={18} weight="bold" />
						</a>
						<a
							href="https://www.github.com/SwitchbackTech/compass-calendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub"
							className="text-text-light transition-colors hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
						>
							<GithubLogoIcon size={18} weight="bold" />
						</a>
					</div>
					<div className="flex items-center gap-4 text-xs text-text-light">
						<a
							href="https://compasscalendar.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-text-lighter hover:underline underline-offset-4"
						>
							Privacy
						</a>
						<a
							href="https://compasscalendar.com/terms"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-text-lighter hover:underline underline-offset-4"
						>
							Terms
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
