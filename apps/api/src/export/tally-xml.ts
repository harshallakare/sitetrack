/**
 * Builds a Tally XML "Import Data" envelope of accounting vouchers -- the
 * format Tally (Prime/ERP 9) reads via Gateway of Tally > Import Data >
 * Vouchers. All amounts are major units (rupees) with 2 decimals, since
 * that's what Tally expects; callers convert from the app's minor units.
 *
 * Tally double-entry convention used here:
 *   ISDEEMEDPOSITIVE = Yes  -> the entry is a DEBIT  (AMOUNT is negative)
 *   ISDEEMEDPOSITIVE = No   -> the entry is a CREDIT (AMOUNT is positive)
 */

export type TallyVoucherType = "Purchase" | "Payment" | "Credit Note";

export interface TallyLedgerEntry {
  ledgerName: string;
  /** true = debit (ISDEEMEDPOSITIVE Yes, negative amount); false = credit. */
  isDebit: boolean;
  /** Absolute amount in major units (rupees). Sign is derived from isDebit. */
  amount: number;
}

export interface TallyVoucher {
  type: TallyVoucherType;
  /** YYYYMMDD once formatted; pass a JS Date. */
  date: Date;
  /** The party (vendor) ledger this voucher is booked against. */
  partyLedgerName: string;
  narration?: string | null;
  reference?: string | null;
  entries: TallyLedgerEntry[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tallyDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function ledgerEntryXml(entry: TallyLedgerEntry): string {
  // Debit entries carry a negative AMOUNT in Tally's import schema; credits
  // are positive. The magnitude is the same either way.
  const signed = entry.isDebit ? -Math.abs(entry.amount) : Math.abs(entry.amount);
  return [
    "        <ALLLEDGERENTRIES.LIST>",
    `          <LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>`,
    `          <ISDEEMEDPOSITIVE>${entry.isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>`,
    `          <AMOUNT>${signed.toFixed(2)}</AMOUNT>`,
    "        </ALLLEDGERENTRIES.LIST>",
  ].join("\n");
}

function voucherXml(voucher: TallyVoucher): string {
  const date = tallyDate(voucher.date);
  return [
    `      <VOUCHER VCHTYPE="${escapeXml(voucher.type)}" ACTION="Create">`,
    `        <DATE>${date}</DATE>`,
    `        <EFFECTIVEDATE>${date}</EFFECTIVEDATE>`,
    `        <VOUCHERTYPENAME>${escapeXml(voucher.type)}</VOUCHERTYPENAME>`,
    `        <PARTYLEDGERNAME>${escapeXml(voucher.partyLedgerName)}</PARTYLEDGERNAME>`,
    voucher.reference ? `        <REFERENCE>${escapeXml(voucher.reference)}</REFERENCE>` : null,
    voucher.narration ? `        <NARRATION>${escapeXml(voucher.narration)}</NARRATION>` : null,
    ...voucher.entries.map(ledgerEntryXml),
    "      </VOUCHER>",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function buildTallyXml(vouchers: TallyVoucher[]): string {
  const messages = vouchers
    .map((v) => `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n${voucherXml(v)}\n    </TALLYMESSAGE>`)
    .join("\n");

  return [
    "<ENVELOPE>",
    "  <HEADER>",
    "    <TALLYREQUEST>Import Data</TALLYREQUEST>",
    "  </HEADER>",
    "  <BODY>",
    "    <IMPORTDATA>",
    "      <REQUESTDESC>",
    "        <REPORTNAME>Vouchers</REPORTNAME>",
    "      </REQUESTDESC>",
    "      <REQUESTDATA>",
    messages,
    "      </REQUESTDATA>",
    "    </IMPORTDATA>",
    "  </BODY>",
    "</ENVELOPE>",
  ].join("\n");
}
