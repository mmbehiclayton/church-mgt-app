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

export function parseMpesaMessage(message: string): ParsedTransaction | null {
  try {
    // Example: "Ksh 500.00 sent to KCB Pay Bill 522522 for account 131***4378 REPENTANCE AND HOLINESS MISSIONS has been received on 30/01/2026 at 06:18 AM. M-PESA ref UAUEB59H97"

    // 1. Clean message
    const cleanMsg = message.replace(/\r?\n|\r/g, " ").trim();

    // 2. Extract Amount
    const amountMatch = cleanMsg.match(/Ksh\s*([0-9,.]+)\s+sent\s+to/i);
    if (!amountMatch) return null;
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    // 3. Extract Paybill / Bank
    // "sent to KCB Pay Bill 522522 for account"
    // 3. Extract Paybill / Bank
    // "sent to KCB Pay Bill 522522 for account"
    // "sent to Equity Bank"

    // Default to KCB as requested by user if not explicitly another bank
    let paymentMethod = "KCB"; // Default

    const recipientMatch = cleanMsg.match(/sent\s+to\s+(.*?)(?:\s+Pay\s+Bill|\s+for\s+account)/i);
    if (recipientMatch) {
      const potentialName = recipientMatch[1].trim();
      // If we captured something valid that isn't just digits/dates
      if (potentialName && potentialName.length > 1) {
        paymentMethod = potentialName;
      }
    } else {
      // Fallback: Check for "KCB Pay Bill" specifically or other knowns?
      // But user said "default to KCB". logic above does that if match fails?
      // well, let's keep it simple.
      if (cleanMsg.includes("Pay Bill")) {
        const payBillMatch = cleanMsg.match(/sent\s+to\s+(.*?)\s+Pay\s+Bill/i);
        if (payBillMatch) paymentMethod = payBillMatch[1].trim();
      }
    }

    // Ensure we don't return "Pay Bill" as the bank name if regex slipped
    if (paymentMethod.toLowerCase().includes("pay bill")) {
      paymentMethod = paymentMethod.replace(/pay\s+bill/i, "").trim();
    }
    if (!paymentMethod) paymentMethod = "KCB";

    // 4. Extract Account
    // "for account 131***4378"
    const accountMatch = cleanMsg.match(/for\s+account\s+(\S+)/i);
    const account = accountMatch ? accountMatch[1] : "";

    // 5. Extract Account Name
    // "131***4378 REPENTANCE AND HOLINESS MISSIONS has been received"
    const nameMatch = cleanMsg.match(/account\s+\S+\s+(.*?)\s+has\s+been\s+received/i);
    const accountName = nameMatch ? nameMatch[1].trim() : "";

    // 6. Extract Date & Time
    // "on 30/01/2026 at 06:18 AM"
    const dateTimeMatch = cleanMsg.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (!dateTimeMatch) return null;

    const datePart = dateTimeMatch[1];
    const timePart = dateTimeMatch[2];

    // Convert to Date object
    const [day, month, year] = datePart.split('/');
    const dateString = `${year}-${month}-${day} ${timePart}`;
    const transactionDate = new Date(dateString);

    if (isNaN(transactionDate.getTime())) return null;

    // 7. Extract Reference
    // "M-PESA ref UAUEB59H97"
    const refMatch = cleanMsg.match(/M-PESA\s+ref\s+([A-Z0-9]+)/i);
    if (!refMatch) return null;
    const reference = refMatch[1];

    return {
      reference,
      amount,
      transactionDate, // This is a Date object
      transactionTime: timePart,
      paymentMethod,
      account,
      accountName,
      rawMessage: message
    };

  } catch (error) {
    console.error("Parsing Error:", error);
    return null;
  }
}
