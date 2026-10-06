import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeCsvCell, toCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("leaves plain text alone and renders null as empty", () => {
    assert.equal(escapeCsvCell("hello"), "hello");
    assert.equal(escapeCsvCell(null), "");
    assert.equal(escapeCsvCell(undefined), "");
    assert.equal(escapeCsvCell(3), "3");
  });

  it("quotes cells with commas, quotes and newlines", () => {
    assert.equal(escapeCsvCell("a,b"), '"a,b"');
    assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCsvCell("a\nb"), '"a\nb"');
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    assert.equal(escapeCsvCell("=SUM(A1)"), "'=SUM(A1)");
    assert.equal(escapeCsvCell("+1"), "'+1");
    assert.equal(escapeCsvCell("-1"), "'-1");
    assert.equal(escapeCsvCell("@cmd"), "'@cmd");
  });

  it("neutralizes then quotes when both apply", () => {
    assert.equal(escapeCsvCell("=1,2"), `"'=1,2"`);
  });
});

describe("toCsv", () => {
  it("prefixes a BOM and joins rows with CRLF", () => {
    const csv = toCsv(["email", "nickname"], [["a@x.com", "민수"]]);
    assert.equal(csv, "﻿email,nickname\r\na@x.com,민수\r\n");
  });
});
