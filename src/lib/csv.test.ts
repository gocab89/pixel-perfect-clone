import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("uses semicolons and escapes quotes", () => {
    expect(toCsv(["a", "b"], [['x"y', "z"]])).toBe('\uFEFFa;b\r\n"x""y";z');
  });
  it("neutralises formula injection", () => {
    expect(toCsv(["a"], [["=1+1"]])).toBe("\uFEFFa\r\n\"'=1+1\"");
  });
});
