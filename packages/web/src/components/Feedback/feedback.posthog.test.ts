import {
  captureFeedback,
  FEEDBACK_SURVEY,
} from "@web/components/Feedback/feedback.posthog";
import { describe, expect, it, mock } from "bun:test";

describe("captureFeedback", () => {
  it("captures a completed PostHog survey response with app context", () => {
    const capture = mock();

    captureFeedback(
      { capture },
      {
        details: "Keep completed events visible.",
        kind: "suggestion",
        view: "week",
      },
    );

    expect(capture).toHaveBeenCalledWith("survey sent", {
      $survey_id: FEEDBACK_SURVEY.id,
      $survey_name: FEEDBACK_SURVEY.name,
      $survey_questions: [FEEDBACK_SURVEY.question],
      $survey_response: "Keep completed events visible.",
      [`$survey_response_${FEEDBACK_SURVEY.question.id}`]:
        "Keep completed events visible.",
      $survey_completed: true,
      app_version: expect.any(String),
      app_view: "week",
      feedback_source: "command_palette",
      feedback_type: "suggestion",
    });
  });
});
