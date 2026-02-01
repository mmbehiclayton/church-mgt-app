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
    // Example 1: "Ksh 500.00 sent to KCB Pay Bill 522522 for account 131***4378 REPENTANCE AND HOLINESS MISSIONS has been received on 30/01/2026 at 06:18 AM. M-PESA ref UAUEB59H97"
    // Example 2: "UB1GT5MML6 Confirmed. KSH250.00 sent to KCB Paybill AC for account 1304431959 on 1/2/26 at 1:32 PM"

    // 1. Clean message
    const cleanMsg = message.replace(/\r?\n|\r/g, " ").trim();

    // 2. Extract Reference
    // Check for "M-PESA ref REF" OR Start with "REF Confirmed"
    let reference = "";
    const refMatchTrailing = cleanMsg.match(/M-PESA\s+ref\s+([A-Z0-9]+)/i);
    if (refMatchTrailing) {
      reference = refMatchTrailing[1];
    } else {
      // Check for leading "REF Confirmed"
      const refMatchLeading = cleanMsg.match(/^([A-Z0-9]+)\s+Confirmed/i);
      if (refMatchLeading) {
        reference = refMatchLeading[1];
      }
    }

    if (!reference) return null;

    // 3. Extract Amount
    // Matches "Ksh 250.00" or "KSH250.00"
    const amountMatch = cleanMsg.match(/Ksh\s*([0-9,.]+)\s+sent\s+to/i);
    if (!amountMatch) return null;
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    // 4. Extract Paybill / Bank
    let paymentMethod = "KCB"; // Default

    // Look for "sent to X"
    const recipientMatch = cleanMsg.match(/sent\s+to\s+(.*?)(?:\s+Pay\s*Bill|\s+for\s+account)/i);
    if (recipientMatch) {
      const potentialName = recipientMatch[1].trim();
      if (potentialName && potentialName.length > 1) {
        paymentMethod = potentialName;
      }
    } else if (cleanMsg.includes("Pay Bill") || cleanMsg.includes("Paybill")) {
      // Fallback for "KCB Paybill AC" -> Extract anything before "Paybill" or just assume from context
      const payBillMatch = cleanMsg.match(/sent\s+to\s+(.*?)\s+Pay\s*Bill/i);
      if (payBillMatch) paymentMethod = payBillMatch[1].trim();
    }

    // Cleanup payment method
    if (paymentMethod.toLowerCase().includes("pay bill") || paymentMethod.toLowerCase().includes("paybill")) {
      paymentMethod = paymentMethod.replace(/pay\s*bill/i, "").trim();
    }
    if (!paymentMethod) paymentMethod = "KCB";

    // 5. Extract Account
    // "for account 131***4378"
    const accountMatch = cleanMsg.match(/for\s+account\s+(\S+)/i);
    const account = accountMatch ? accountMatch[1] : "";

    // 6. Extract Account Name
    // In the second format, account name might not be present or is just "AC" (which we might ignore?)
    // "131***4378 REPENTANCE AND HOLINESS MISSIONS has been received"
    let accountName = "";
    const nameMatch = cleanMsg.match(/account\s+\S+\s+(.*?)\s+has\s+been\s+received/i);
    if (nameMatch) {
      accountName = nameMatch[1].trim();
    }

    // 7. Extract Date & Time
    // "on 30/01/2026 at 06:18 AM" OR "on 1/2/26 at 1:32 PM"
    // Regex Update: (\d{1,2}\/\d{1,2}\/\d{2,4})
    const dateTimeMatch = cleanMsg.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (!dateTimeMatch) return null;

    const datePart = dateTimeMatch[1];
    const timePart = dateTimeMatch[2];

    // Convert to Date object
    const [day, month, yearStr] = datePart.split('/');
    let year = parseInt(yearStr);
    if (year < 100) {
      year += 2000; // Assume 21st century for 2-digit years
    }
    const dateString = `${year}-${month}-${day} ${timePart}`;
    const transactionDate = new Date(dateString);

    if (isNaN(transactionDate.getTime())) return null;

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
