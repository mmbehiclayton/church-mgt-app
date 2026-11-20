export interface ParsedTransaction {
  reference: string;
  amount: number;
  transactionDate: Date; // Full ISO DateTime
  transactionTime: string; // HH:MM AM/PM
  paymentMethod: string; // "Pay Bill" or "Bank" etc
  account: string; // Masked account
  accountName: string; // "REPENTANCE AND HOLINESS MISSIONS"
  rawMessage: string;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses date + time from the message. Supports:
 *  - "on 30/01/2026 at 06:18 AM", "on 1/2/26 at 1:32 PM", "on 19/11/2026 09:37 PM"
 *  - "on 28th Sep 2026 at 8:44 pm"
 */
function parseDateTime(msg: string): { date: Date; time: string } | null {
  const timeMatch = msg.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!timeMatch) return null;
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const isPm = timeMatch[3].toUpperCase() === "PM";
  if (hour === 12) hour = 0;
  if (isPm) hour += 12;
  const time = `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`;

  let day: number, month: number, year: number;
  const numeric = msg.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  const textual = msg.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})\b/);
  if (numeric) {
    day = parseInt(numeric[1], 10);
    month = parseInt(numeric[2], 10) - 1;
    year = parseInt(numeric[3], 10);
  } else if (textual && MONTHS[textual[2].slice(0, 3).toLowerCase()] !== undefined) {
    day = parseInt(textual[1], 10);
    month = MONTHS[textual[2].slice(0, 3).toLowerCase()];
    year = parseInt(textual[3], 10);
  } else {
    return null;
  }
  if (year < 100) year += 2000;

  const date = new Date(year, month, day, hour, minute);
  if (isNaN(date.getTime())) return null;
  return { date, time };
}

export function parseMpesaMessage(message: string): ParsedTransaction | null {
  try {
    // Supported formats:
    // 1. "Ksh 500.00 sent to KCB Pay Bill 522522 for account 131***4378 REPENTANCE AND HOLINESS MISSIONS has been received on 30/01/2026 at 06:18 AM. M-PESA ref UAUEB59H97"
    // 2. "UB1GT5MML6 Confirmed. KSH250.00 sent to KCB Paybill AC for account 1304431959 on 1/2/26 at 1:32 PM"
    // 3. "KES 300.00 received in a/c REPENTANCE AND HOLINESS MISSIONS 131***4378 on 19/11/2026 09:37 PM. M-PESA Ref UKJCL34LAA. To reverse, ..."
    // 4. "UISEB8J7YW Confirmed. Ksh 1,000.00 paid to KCB Paybill AC, 522522 for account number 1317734246 via My OneApp on 28th Sep 2026 at 8:44 pm"

    const cleanMsg = message.replace(/\s+/g, " ").trim();

    // Reference: trailing "M-PESA ref X" or leading "X Confirmed"
    let reference = "";
    const refMatchTrailing = cleanMsg.match(/M-PESA\s+ref\.?\s+([A-Z0-9]+)/i);
    if (refMatchTrailing) {
      reference = refMatchTrailing[1];
    } else {
      const refMatchLeading = cleanMsg.match(/^([A-Z0-9]+)\s+Confirmed/i);
      if (refMatchLeading) reference = refMatchLeading[1];
    }
    if (!reference) return null;

    // Amount: "Ksh 250.00", "KSH250.00", "KES 300.00", "Ksh 1,000.00"
    const amountMatch = cleanMsg.match(/\b(?:Ksh|KES)\.?\s*([0-9][0-9,]*(?:\.\d+)?)/i);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(amount)) return null;

    // Payment method: "sent|paid to X Pay Bill" -> X (default KCB)
    let paymentMethod = "KCB";
    const recipientMatch = cleanMsg.match(/(?:sent|paid)\s+to\s+(.*?)\s+(?:Pay\s*Bill|for\s+account)/i);
    if (recipientMatch) {
      const potentialName = recipientMatch[1].trim();
      if (potentialName.length > 1) paymentMethod = potentialName;
    }

    // Account + account name
    let account = "";
    let accountName = "";
    const accountMatch = cleanMsg.match(/for\s+account(?:\s+(?:number|no\.?))?\s+(\S+)/i);
    if (accountMatch) {
      account = accountMatch[1];
      // "131***4378 REPENTANCE AND HOLINESS MISSIONS has been received"
      const nameMatch = cleanMsg.match(/account(?:\s+(?:number|no\.?))?\s+\S+\s+(.*?)\s+has\s+been\s+received/i);
      if (nameMatch) accountName = nameMatch[1].trim();
    } else {
      // "received in a/c REPENTANCE AND HOLINESS MISSIONS 131***4378 on ..."
      const acMatch = cleanMsg.match(/a\/c\s+(.*?)\s+on\s+\d/i);
      if (acMatch) {
        const parts = acMatch[1].trim().split(" ");
        const last = parts[parts.length - 1];
        if (parts.length > 1 && /\d/.test(last)) {
          account = last;
          accountName = parts.slice(0, -1).join(" ");
        } else {
          accountName = acMatch[1].trim();
        }
      }
    }

    const dt = parseDateTime(cleanMsg);
    if (!dt) return null;

    return {
      reference,
      amount,
      transactionDate: dt.date,
      transactionTime: dt.time,
      paymentMethod,
      account,
      accountName,
      rawMessage: message,
    };
  } catch (error) {
    console.error("Parsing Error:", error);
    return null;
  }
}
