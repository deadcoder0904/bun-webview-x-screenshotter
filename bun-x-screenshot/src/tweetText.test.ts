import { describe, expect, test } from "bun:test";
import { clampTweetText, createApproxTweetTextFitter, MAX_TWEET_CHARS } from "./tweetText";

describe("clampTweetText", () => {
  const fitsTweetCard = createApproxTweetTextFitter({
    maxLines: 7,
    maxWidth: 535,
  });

  test("keeps tweet 1 up to 'US culture only' before Show more", () => {
    const text =
      "back in the 90s, Microsoft would interview competitors' candidates to strip-mine them for product and strategy info, then not hire them.\nthat cutthroat behavior sat alongside casual NDA skirting, aggressive poaching, and hardball sales. it was considered smart.\nUS culture only supercalifragilisticexpialidocious-and-more-context-that-should-not-fit";

    const result = clampTweetText(text, fitsTweetCard);

    expect(result.isClamped).toBe(true);
    expect(result.truncated.includes("US culture only")).toBe(true);
  });

  test("clamps at 280 characters even when the card is visually short", () => {
    const text = `${"a".repeat(MAX_TWEET_CHARS)} extra`;

    const result = clampTweetText(text, () => true);

    expect(result.isClamped).toBe(true);
    expect(result.truncated.length).toBe(MAX_TWEET_CHARS);
  });

  test("does not show Show more for the short newline-heavy tweet", () => {
    const text =
      "i am learning that you guys don't know how to talk to consumers\nfor your landing pages/app store PLS don't focus copy around your product\nfocus around the consumer -> how does it benefit them/make their life easier? use emotion-based copy\nattached a good + bad example below";

    const result = clampTweetText(text, fitsTweetCard);

    expect(result.isClamped).toBe(false);
    expect(result.truncated).toBe(text);
  });

  test("preserves newline boundaries in the collapsed output", () => {
    const text =
      "line one stays\nline two also stays\nline three is long enough to force a cut once we add more trailing words after this point and keep going";

    const result = clampTweetText(
      text,
      createApproxTweetTextFitter({ maxLines: 2, maxWidth: 320 }),
    );

    expect(result.isClamped).toBe(true);
    expect(result.truncated.includes("\n")).toBe(true);
  });
});
