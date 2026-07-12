import { generateId } from "ai-governor/dist/core/utils/index.js";

export interface ImplementationPlan {
  readonly functionName: string;
  readonly signature: string;
  readonly implementation: string;
  readonly testCode: string;
  readonly testCases: readonly { input: string; expected: boolean; description: string }[];
}

export class ImplementationPlanner {
  collectEvidence(_analysis: unknown): ImplementationPlan {
    return {
      functionName: "isPalindrome",
      signature: "isPalindrome(s: string): boolean",
      implementation: `export function isPalindrome(s: string): boolean {
  const cleaned = s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (cleaned.length <= 1) return true;
  let left = 0;
  let right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
      testCode: `import { describe, it, expect } from "vitest";
import { isPalindrome } from "./implementation";

describe("isPalindrome", () => {
  it("returns true for empty string", () => {
    expect(isPalindrome("")).toBe(true);
  });

  it("returns true for single character", () => {
    expect(isPalindrome("a")).toBe(true);
  });

  it("returns true for simple palindrome", () => {
    expect(isPalindrome("racecar")).toBe(true);
  });

  it("returns false for non-palindrome", () => {
    expect(isPalindrome("hello")).toBe(false);
  });

  it("handles mixed case", () => {
    expect(isPalindrome("RaceCar")).toBe(true);
  });

  it("handles punctuation", () => {
    expect(isPalindrome("A man, a plan, a canal: Panama")).toBe(true);
  });

  it("handles numeric characters", () => {
    expect(isPalindrome("12321")).toBe(true);
  });

  it("handles only non-alphanumeric characters", () => {
    expect(isPalindrome("!!!")).toBe(true);
  });
});`,
      testCases: [
        { input: '""', expected: true, description: "Empty string" },
        { input: '"a"', expected: true, description: "Single character" },
        { input: '"racecar"', expected: true, description: "Simple palindrome" },
        { input: '"hello"', expected: false, description: "Non-palindrome" },
        { input: '"RaceCar"', expected: true, description: "Mixed case" },
        { input: '"A man, a plan, a canal: Panama"', expected: true, description: "With punctuation" },
        { input: '"12321"', expected: true, description: "Numeric" },
        { input: '"!!!"', expected: true, description: "Only non-alphanumeric" },
      ],
    };
  }
}
