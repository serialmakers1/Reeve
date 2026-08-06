import { describe, it, expect } from "vitest";
import { RATING_QUESTIONS, isComplete, TONE_CARD, type RatingAnswers } from "../ratingQuestions";

describe("ratingQuestions config", () => {
  it("has exactly five mandatory questions in fixed order", () => {
    expect(RATING_QUESTIONS.map((q) => q.key)).toEqual([
      "reach",
      "accuracy",
      "progress",
      "respect",
      "trust",
    ]);
  });

  it("only Q2 (accuracy) and Q3 (progress) carry helper text", () => {
    const withHelper = RATING_QUESTIONS.filter((q) => q.helper).map((q) => q.key);
    expect(withHelper).toEqual(["accuracy", "progress"]);
  });

  it("progress is the only question with a neutral (mutual_stop) option", () => {
    const progress = RATING_QUESTIONS.find((q) => q.key === "progress")!;
    expect(progress.options.some((o) => o.value === "mutual_stop" && o.tone === "neutral")).toBe(true);
    const others = RATING_QUESTIONS.filter((q) => q.key !== "progress");
    expect(others.every((q) => q.options.every((o) => o.tone !== "neutral"))).toBe(true);
  });

  it("every option value maps to a defined tone class set", () => {
    for (const q of RATING_QUESTIONS) {
      for (const o of q.options) {
        expect(TONE_CARD[o.tone]).toBeDefined();
      }
    }
  });
});

describe("isComplete", () => {
  it("false until all five answers present", () => {
    const partial = { reach: "easily", accuracy: "matched", progress: "next_step", respect: "yes" };
    expect(isComplete(partial)).toBe(false);
  });

  it("true when all five present", () => {
    const full: RatingAnswers = {
      reach: "easily",
      accuracy: "matched",
      progress: "mutual_stop",
      respect: "yes",
      trust: "maybe",
    };
    expect(isComplete(full)).toBe(true);
  });
});
