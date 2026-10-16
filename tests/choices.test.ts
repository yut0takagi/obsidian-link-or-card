import { describe, expect, it } from "vitest";
import { conversionsFor, pasteChoices } from "../src/choices";
import { isInsideTable } from "../src/editorText";

const doc = (text: string) => {
  const lines = text.split("\n");
  return { getLine: (line: number) => lines[line] ?? "", lineCount: () => lines.length };
};

describe("pasteChoices", () => {
  it("offers every style in prose", () => {
    expect(pasteChoices(false)).toEqual(["card", "link", "plain"]);
  });

  it("leaves the card out in a table cell, where a block would split the row", () => {
    const table = doc("| a | b |\n| --- | --- |\n| x |  |");
    expect(pasteChoices(isInsideTable(table, 2))).toEqual(["link", "plain"]);
  });
});

describe("conversionsFor", () => {
  it("never offers the form a link already has", () => {
    expect(conversionsFor("bare", false)).toEqual(["card", "link"]);
    expect(conversionsFor("markdown", false)).toEqual(["card", "plain"]);
    expect(conversionsFor("card", false)).toEqual(["link", "plain"]);
  });

  it("does not offer a card for a link in a table", () => {
    expect(conversionsFor("bare", true)).toEqual(["link"]);
    expect(conversionsFor("markdown", true)).toEqual(["plain"]);
  });
});
