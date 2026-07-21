import { buildTallyXml, type TallyVoucher } from "./tally-xml";

describe("buildTallyXml", () => {
  it("wraps vouchers in the Tally Import Data envelope", () => {
    const xml = buildTallyXml([]);
    expect(xml).toContain("<ENVELOPE>");
    expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
    expect(xml).toContain("<REPORTNAME>Vouchers</REPORTNAME>");
    expect(xml).toContain("</ENVELOPE>");
  });

  it("emits correct double-entry for a purchase (Dr Purchase, Cr vendor)", () => {
    const voucher: TallyVoucher = {
      type: "Purchase",
      date: new Date("2026-07-05T00:00:00Z"),
      partyLedgerName: "Rakesh & Sons",
      reference: "INV-42",
      narration: "cement",
      entries: [
        { ledgerName: "Purchase Account", isDebit: true, amount: 5000 },
        { ledgerName: "Rakesh & Sons", isDebit: false, amount: 5000 },
      ],
    };
    const xml = buildTallyXml([voucher]);

    expect(xml).toContain('<VOUCHER VCHTYPE="Purchase" ACTION="Create">');
    expect(xml).toContain("<DATE>20260705</DATE>");
    expect(xml).toContain("<REFERENCE>INV-42</REFERENCE>");

    // Debit line: ISDEEMEDPOSITIVE Yes, negative amount.
    expect(xml).toMatch(
      /<LEDGERNAME>Purchase Account<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-5000\.00<\/AMOUNT>/
    );
    // Credit line: ISDEEMEDPOSITIVE No, positive amount.
    expect(xml).toMatch(
      /<LEDGERNAME>Rakesh &amp; Sons<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>5000\.00<\/AMOUNT>/
    );
  });

  it("escapes XML metacharacters in ledger names and narration", () => {
    const xml = buildTallyXml([
      {
        type: "Payment",
        date: new Date("2026-07-10T00:00:00Z"),
        partyLedgerName: 'A & B <Traders> "Ltd"',
        narration: "note with <tag> & 'quote'",
        reference: null,
        entries: [{ ledgerName: 'A & B <Traders> "Ltd"', isDebit: true, amount: 100 }],
      },
    ]);
    expect(xml).toContain("A &amp; B &lt;Traders&gt; &quot;Ltd&quot;");
    expect(xml).toContain("note with &lt;tag&gt; &amp; &apos;quote&apos;");
    expect(xml).not.toContain("<Traders>");
  });

  it("omits optional REFERENCE/NARRATION when null", () => {
    const xml = buildTallyXml([
      {
        type: "Credit Note",
        date: new Date("2026-07-12T00:00:00Z"),
        partyLedgerName: "Vendor",
        reference: null,
        narration: null,
        entries: [{ ledgerName: "Vendor", isDebit: true, amount: 500 }],
      },
    ]);
    expect(xml).not.toContain("<REFERENCE>");
    expect(xml).not.toContain("<NARRATION>");
  });

  it("formats amounts to two decimals regardless of input precision", () => {
    const xml = buildTallyXml([
      {
        type: "Payment",
        date: new Date("2026-07-10T00:00:00Z"),
        partyLedgerName: "V",
        entries: [{ ledgerName: "V", isDebit: false, amount: 1234.5 }],
      },
    ]);
    expect(xml).toContain("<AMOUNT>1234.50</AMOUNT>");
  });
});
