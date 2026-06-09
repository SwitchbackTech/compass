import {
	GithubLogoIcon,
	LinkedinLogoIcon,
	XLogoIcon,
} from "@phosphor-icons/react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { Z_INDEX_MODAL } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import {
	type KeyboardEvent,
	type MouseEvent,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { FAQ_ITEMS } from "./faq";
import { hasSeenWelcome, markWelcomeSeen } from "./welcome.modal.util";

export function WelcomeModal() {
	const { authenticated } = useContext(SessionContext);
	const { openModal } = useAuthModal();
	const disclosureIdPrefix = useId();
	const [isOpen, setIsOpen] = useState(
		() => !authenticated && !hasSeenWelcome(),
	);
	const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(
		() => new Set(),
	);
	const backdropRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		backdropRef.current?.focus();
	}, []);

	if (!isOpen) return null;

	const dismiss = () => {
		markWelcomeSeen();
		setIsOpen(false);
	};

	const handleLogIn = () => {
		dismiss();
		openModal("login");
	};

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) {
			dismiss();
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			dismiss();
		}
	};

	const toggleFaq = (question: string) => {
		setExpandedFaqs((currentFaqs) => {
			const nextFaqs = new Set(currentFaqs);

			if (nextFaqs.has(question)) {
				nextFaqs.delete(question);
			} else {
				nextFaqs.add(question);
			}

			return nextFaqs;
		});
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The backdrop catches outside clicks and Escape to dismiss the welcome modal.
		<div
			className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-bg-primary/85 py-8 backdrop-blur-sm"
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			ref={backdropRef}
			role="presentation"
			style={{ zIndex: Z_INDEX_MODAL }}
			tabIndex={-1}
		>
			<div
				role="dialog"
				aria-modal
				aria-label="Welcome to Compass Calendar"
				className="flex w-140 max-w-[90vw] flex-col gap-6 rounded-xl bg-panel-bg p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
			>
				{/* Header */}
				<div className="flex flex-col gap-2">
					<h2 className="font-bold text-2xl text-text-lighter">Ahoy!</h2>
					<p className="text-text-lighter">
						You found a simple, fast calendar.
					</p>
				</div>

				{/* Action buttons */}
				<div className="flex gap-3">
					<button
						type="button"
						onClick={dismiss}
						className="c-button c-button-primary flex-1"
					>
						Start Now
					</button>
					<button
						type="button"
						onClick={handleLogIn}
						className="c-button c-button-secondary flex-1"
					>
						Log In
					</button>
				</div>

				{/* FAQ */}
				<div className="flex flex-col divide-y divide-border-primary">
					{FAQ_ITEMS.map((item, index) => {
						const isExpanded = expandedFaqs.has(item.question);
						const answerId = `${disclosureIdPrefix}-faq-answer-${index}`;
						const state = isExpanded ? "open" : "closed";

						return (
							<div key={item.question} className="py-3">
								<button
									type="button"
									aria-controls={answerId}
									aria-expanded={isExpanded}
									className="c-focus-ring w-full cursor-pointer select-none text-left font-medium text-sm text-text-lighter transition-colors hover:text-text-lightest"
									onClick={() => toggleFaq(item.question)}
								>
									{item.question}
								</button>
								<div
									id={answerId}
									aria-hidden={!isExpanded}
									className="c-disclosure-content"
									data-state={state}
								>
									<div>
										<div className="mt-2 text-sm text-text-light leading-relaxed">
											{item.answer !== null ? (
												item.answer
											) : (
												<>
													Yes! The repo includes the API, frontend, CLI, and
													more. You can run it yourself too; read the{" "}
													<a
														href="/blog/self-host"
														className="c-focus-ring font-medium text-accent-primary underline-offset-4 hover:underline"
													>
														self-hosting guide
													</a>{" "}
													to set up your own instance.
												</>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Footer: social + legal */}
				<div className="flex items-center justify-between border-border-primary border-t pt-4">
					<div className="flex items-center gap-3">
						<a
							href="https://x.com/CompassCalendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="X (Twitter)"
							className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
						>
							<XLogoIcon size={18} weight="bold" />
						</a>
						<a
							href="https://www.linkedin.com/company/compass-calendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="LinkedIn"
							className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
						>
							<LinkedinLogoIcon size={18} weight="bold" />
						</a>
						<a
							href="https://www.github.com/SwitchbackTech/compass-calendar"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub"
							className="c-focus-ring text-text-light transition-colors hover:text-text-lighter"
						>
							<GithubLogoIcon size={18} weight="bold" />
						</a>
					</div>
					<div className="flex items-center gap-4 text-text-light text-xs">
						<a
							href="https://compasscalendar.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="c-focus-ring underline-offset-4 hover:text-text-lighter hover:underline"
						>
							Privacy
						</a>
						<a
							href="https://compasscalendar.com/terms"
							target="_blank"
							rel="noopener noreferrer"
							className="c-focus-ring underline-offset-4 hover:text-text-lighter hover:underline"
						>
							Terms
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
