import { APP_VERSION } from "@web/common/constants/version.constants";
import { type FeedbackRequest } from "@web/components/Feedback/feedback.store";

export const FEEDBACK_SURVEY = {
  id: "019a13d7-eb0b-0000-df78-ef3df70db610",
  name: "Open feedback",
  question: {
    id: "d0154ae2-c312-4d19-9d03-bb28eb56d6e3",
    question: "What can we do to improve Compass?",
  },
} as const;

interface PostHogCaptureClient {
  capture: (event: string, properties: Record<string, unknown>) => unknown;
}

interface FeedbackSubmission extends FeedbackRequest {
  details: string;
}

export function captureFeedback(
  posthog: PostHogCaptureClient,
  { details, kind, view }: FeedbackSubmission,
): void {
  posthog.capture("survey sent", {
    $survey_id: FEEDBACK_SURVEY.id,
    $survey_name: FEEDBACK_SURVEY.name,
    $survey_questions: [FEEDBACK_SURVEY.question],
    $survey_response: details,
    [`$survey_response_${FEEDBACK_SURVEY.question.id}`]: details,
    $survey_completed: true,
    app_version: APP_VERSION,
    app_view: view,
    feedback_source: "command_palette",
    feedback_type: kind,
  });
}
