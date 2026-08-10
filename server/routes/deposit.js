import express from 'express';
import prisma from '../lib/prisma.js';

import pdfParse from 'pdf-parse';
const router = express.Router();
import axios from "axios";
/**
 * Parse a TeleBirr transaction page and extract key details.
 * @param {string} url - TeleBirr receipt URL
 * @returns {object|null} - Object with payer, receiver, status, date, amount
 */

// Helper to fetch and parse CBE PDF for multiple fields
async function getCBETransactionDetails(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/pdf")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text || "";

    // Extract Amount
    const amountPatterns = [
      /Transferred Amount\s*([\d,]+\.\d{2})\s*ETB/i,
      /Total amount debited.*?([\d,]+\.\d{2})\s*ETB/i,
      /([\d,]+\.\d{2})\s*ETB/,
    ];
    let amount = null;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = match[1];
        break;
      }
    }
    amount = amount ? Number(amount.replace(/,/g, "")) : null;

    // Extract Payment Date & Time
    let paymentDateTime = null;
    const datePattern = /Payment Date & Time\s*([^\n]+)/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) paymentDateTime = dateMatch[1].trim();

    // Extract Receiver (stop at next line or 'Account')
    let receiver = null;
    const receiverPattern = /Receiver\s*:?\s*([A-Za-z0-9\s\-]+)/i;
    const receiverMatch = text.match(receiverPattern);
    if (receiverMatch) {
      receiver = receiverMatch[1].trim();
      // Remove trailing 'Account' or 'Account1' if present
      receiver = receiver.replace(/Account\s*1?.*$/i, '').trim();
    }

    // Extract the second Account (receiver's account)
    let account = null;
    const accountPatternGlobal = /Account\s*:?\s*([A-Za-z0-9\*]+)/g;
    const accountMatches = [...text.matchAll(accountPatternGlobal)];
    if (accountMatches.length > 1) {
      account = accountMatches[1][1].trim(); // second occurrence
    } else if (accountMatches.length === 1) {
      account = accountMatches[0][1].trim();
    }

    return { amount, paymentDateTime, receiver, account };
  } catch (err) {
    console.error("Error fetching/parsing CBE PDF:", err);
    return null;
  }
}


router.post('/', async (req, res) => {
  try {
    const { userId, transactionId } = req.body;
    if (!userId || !transactionId) return res.status(400).json({ error: 'Missing userId or transactionId' });

    // Check if transactionId is already approved (exists in Transaction table)




    const existingTransaction = await prisma.transaction.findFirst({
      where: { transactionId },
    });

    if (existingTransaction) {
      return res.status(409).json({ error: 'This transaction has already been approved.' });


    }

    // Prevent multiple pending deposits for the same user
    const existingPending = await prisma.depositRequest.findFirst({
      where: { userId: Number(userId), status: 'pending' },
    });
    if (existingPending) return res.status(409).json({ error: 'ያልተጠናቀቀ የገቢ ጥያቄ አለዎት፣ እባክዎ እስኪጠናቀቅ በትዕግስት ይጠብቁን።' });

    // Fetch and parse the PDF to get all details






    const url = `https://apps.cbe.com.et:100/?id=${transactionId}`;
    const details = await getCBETransactionDetails(url);
    if (!details || !details.amount) return res.status(400).json({ error: 'Transaction details not found' });






    const expectedReceiver = process.env.CBE_RECEIVER_NAME;
    const expectedAccount = process.env.CBE_RECEIVER_ACCOUNT;
    if(details.receiver !== expectedReceiver || details.account !== expectedAccount) {
      return res.status(400).json({ error: 'Invalid receiver or account.' });






    }
    let transaction, deposit;
    try {
      transaction = await prisma.transaction.create({


        data: {
          userId: Number(userId),
          amount: details.amount,
          transactionId,
          paymentDateTime: details.paymentDateTime,
          receiver: details.receiver,
          account: details.account,
        },
      });
      // Create depositRequest for tracking
      deposit = await prisma.depositRequest.create({

        data: {
          userId: Number(userId),
          amount: details.amount,
          transactionId,
          paymentDateTime: details.paymentDateTime,
          receiver: details.receiver,
          account: details.account,
          status: 'approved',
        },
      });
      // Only update balance after both transaction and depositRequest are saved
      await prisma.userBalance.upsert({

        where: { userId: Number(userId) },
        update: {
          currentBalance: { increment: details.amount },
          totalDeposits: { increment: details.amount },
        },
        create: {
          userId: Number(userId),
          currentBalance: details.amount,
          totalDeposits: details.amount,
        },
      });
      await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          rewardBalance: { increment: Math.floor(details.amount * 0.1) },
        },
      });
    } catch (err) {
      // Prisma unique constraint error code
      if (err.code === 'P2002' && err.meta && err.meta.target && err.meta.target.includes('transactionId')) {
        return res.status(409).json({ error: 'This transaction has already been approved (unique constraint).' });

















      }
      throw err;
    }
    res.json({ success: true, transaction, deposit });







  } catch (err) {
    res.status(500).json({ error: 'Failed to create deposit requested' });













  }
});

router .post('/teleBirr', async (req, res) => {
  try {
    const { userId, transactionId } = req.body;
    if(!userId || !transactionId) return res.status(400).json({ error: 'Missing userId or transactionId' });
    // Check if transactionId is already approved (exists in Transaction table)
    console.log("Checking existing transactions for transactionId:", transactionId);

    const existingTransactions = await prisma.transaction.findFirst({
      where: { transactionId },
    });
    if (existingTransactions) {
      return res.status(409).json({ error: 'This transaction has already been approved.' });
    }
    const url = `https://transactioninfo.ethiotelecom.et/receipt/${transactionId}`;
    const details = await parseTelebirr(url);
   console.log("Parsed TeleBirr details:", details);
    if (!details || !details.amount) {
      return res.status(400).json({ error: 'Transaction details not found or amount missing.' });
    }
    const expectedTeleReceiver = process.env.TELEBIRR_RECEIVER_NAME;
    const expectedTeleAccount = process.env.TELEBIRR_RECEIVER_ACCOUNT;
    console.log(details);
    if(details.receiverName !== expectedTeleReceiver || details.receiverPhone !== expectedTeleAccount) {
      return res.status(400).json({ error: 'Invalid receiver or account.' });
    }
    // Check if transactionId is already approved (exists in Transaction table)
    const existingTransaction = await prisma.transaction.findFirst({
      where: { transactionId },
    });
    if (existingTransaction) {
      return res.status(409).json({ error: 'This transaction has already been approved.' });
    }
    // Prevent multiple pending deposits for the same user
    const existingPending = await prisma.depositRequest.findFirst({
      where: { userId: Number(userId), status: 'pending' },
    });
    if (existingPending) return res.status(409).json({ error: 'ያልተጠናቀቀ የገቢ ጥያቄ አለዎት፣ እባክዎ እስኪጠናቀቅ በትዕግስት ይጠብቁን።' });

    console.log("TeleBirr details:", details);

    let transaction, deposit;
    try {
      transaction = await prisma.transaction.create({
        data: {
          userId: Number(userId),
          amount: Number(details.amount),
          transactionId,
          paymentDateTime: details.date,
          receiver: details.receiverName,
          account: details.receiverPhone,
        },
      });
      deposit = await prisma.depositRequest.create({
        data: {
          userId: Number(userId),
          amount: Number(details.amount),
          transactionId,
          paymentDateTime: details.date,
          receiver: details.receiverName,
          account: details.receiverPhone,
          status: 'approved',
        },
      });
      // Only update balance after both transaction and depositRequest are saved
      await prisma.userBalance.upsert({
        where: { userId: Number(userId) },
        update: {
          currentBalance: { increment: Number(details.amount) },
          totalDeposits: { increment: Number(details.amount) },
        },
        create: {
          userId: Number(userId),
          currentBalance: Number(details.amount),
          totalDeposits: Number(details.amount),
        },
      });
      await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          rewardBalance: { increment: Math.floor(Number(details.amount) * 0.1) },
        },
      });
    } catch (err) {
      if (err.code === 'P2002' && err.meta && err.meta.target && err.meta.target.includes('transactionId')) {
        return res.status(409).json({ error: 'This transaction has already been approved (unique constraint).' });
      }
      throw err;
    }
    res.json({ success: true, transaction, deposit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process TeleBirr transaction' });
  }
});
router.post('/tele', async (req, res) => {
  try {
    const { userId, transactionId ,amount} = req.body;
    if(!userId || !transactionId ||!amount) return res.status(400).json({ error: 'Missing userId or transactionId' });
    // Check if transactionId is already approved (exists in Transaction table)
    console.log("Checking existing transactions for transactionId:", transactionId);

    const existingTransactions = await prisma.transaction.findFirst({
      where: { transactionId },
    });
    if (existingTransactions) {
      return res.status(409).json({ error: 'This transaction has already been approved.' });
    }
    if (!userId || !amount) return res.status(400).json({ error: 'Missing userId or amount' });
    // Prevent multiple pending deposits for the same user
    const existingPending = await prisma.depositRequest.findFirst({
      where: { userId: Number(userId), status: 'pending' },
    });
    if (existingPending) return res.status(409).json({ error: 'You have a pending deposit request' });
    const deposit = await prisma.depositRequest.create({
      data: {
        userId: Number(userId),
        amount: Number(amount),
        transactionId,
        paymentDateTime: "date",
        receiver: "receiver",
        account: "account",
        status: 'pending',
      },
    });
    res.json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create deposit request' });
  }
});


// GET /deposit/history?userId=123 - get deposit history for a user
router.get('/history', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const history = await prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        transactionId: true,
        paymentDateTime:true
      },
    });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposit history' });
  }
});


export async function parseCBEBirr(transactionId) {
  try {
    const phone = process.env.cbeBirrReceiverAccount;

    const url = `https://cbepay1.cbe.com.et/aureceipt?TID=${transactionId}&PH=0${phone}`;

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 70000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf",
        "Referer": "https://cbepay1.cbe.com.et/",
      },
    });

    const pdfBuffer = Buffer.from(response.data);
    const parsed = await pdfParse(pdfBuffer);

    const text = parsed.text;

    console.log("---- RAW TEXT ----");
    console.log(text.substring(0, 1000));
    let amount = null;
    // 1. Try to match 'Paid amount' (case-insensitive)
    const paidAmountMatch = text.match(/Paid amount\s*([\d]+\.\d{2})/i);
    if (paidAmountMatch) {
      amount = Number(paidAmountMatch[1]);
    } else {
      // 2. Try to extract all numbers after 'Transaction Details' and pick the last nonzero value
      const detailsSection = text.split(/Transaction Details/i)[1];
      if (detailsSection) {
        // Find all numbers with two decimals in this section
        const numbers = [...detailsSection.matchAll(/([\d]+\.\d{2})/g)].map(m => Number(m[1])).filter(n => n > 0);
        if (numbers.length > 0) {
          amount = numbers[numbers.length - 1];
        }
      }
      // 3. Fallback: pick the minimum value among all numbers with two decimals (to avoid picking large numbers from IDs)
      if (amount === null) {
        const allAmounts = [...text.matchAll(/\b([\d]+\.\d{2})\b/g)].map(m => Number(m[1]));
        if (allAmounts.length > 0) {
          amount = Math.min(...allAmounts);
        }
      }
    }

    // =========================
    // 👤 SENDER (FIXED MULTILINE)
    // =========================
    const senderMatch = text.match(
      /Debit Account\s*(\d+)\s*-\s*([\s\S]*?)\n\s*Credit Account/i
    );

    const senderAccount = senderMatch ? senderMatch[1] : null;
    const senderName = senderMatch
      ? senderMatch[2].replace(/\s+/g, " ").trim()
      : null;

    // =========================
    // 🧾 RECEIVER (NO SPACE FIX)
    // =========================
    const receiverMatch = text.match(
      /Receiver Name\s*(\d+)\s*-\s*([\s\S]*?)\n\s*Order ID/i
    );

    const receiverAccount = receiverMatch ? receiverMatch[1] : null;
    const receiverName = receiverMatch
      ? receiverMatch[2].replace(/\s+/g, " ").trim()
      : null;

    // =========================
    // 🆔 TRANSACTION ID (NO SPACE FIX)
    // =========================
    const txnMatch = text.match(/Order ID\s*([A-Z0-9]+)/i);
    const txnId = txnMatch ? txnMatch[1] : null;

    // =========================
    // ✅ STATUS (NO SPACE FIX)
    // =========================
    const statusMatch = text.match(/Transaction Status\s*(\w+)/i);
    const status = statusMatch ? statusMatch[1] : null;

    // =========================
    // 📅 DATE
  let date = null;

// ✅ Handle merged format like:
// DCT019CNSZM2026-03-29 21:535.00
const dateMatch1 = text.match(
  /(202\d-\d{2}-\d{2})\s*(\d{2}:\d{2})/
);

// ✅ Fallback: normal format
const dateMatch2 = text.match(
  /\b(202\d-\d{2}-\d{2}\s+\d{2}:\d{2})\b/
);

if (dateMatch1) {
  date = `${dateMatch1[1]} ${dateMatch1[2]}`;
} else if (dateMatch2) {
  date = dateMatch2[1];
}

    return {
      transactionId: txnId,
      status,
      amount,
      date,
      receiverName,
      receiverAccount,
      senderName,
      senderAccount,
    };

  } catch (err) {
    console.error("❌ CBE Birr parse error:", err.message);
    return null;
  }
}
router.post("/cbe-birr", async (req, res) => {
  try {
    const { userId, transactionId } = req.body;

    if (!userId || !transactionId) {
      return res.status(400).json({
        error: "Missing userId or transactionId",
      });
    }

    // 🔒 Check duplicate transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: { transactionId },
    });

    if (existingTransaction) {
      return res.status(409).json({
        error: "Transaction already used",
      });
    }

    // 🚀 Parse PDF
    const details = await parseCBEBirr(transactionId);
    console.log(details);

    if (!details || !details.amount) {
      return res.status(400).json({
        error: "Invalid or not found transaction",
      });
    }

    // ❌ Reject if not completed
    if (details.status !== "Completed") {
      return res.status(400).json({
        error: "Transaction not completed",
      });
    }


    const envReceiverName = process.env.cbeBirrReceiverName;
    const envReceiverAccount = process.env.cbeBirrReceiverAccount;
    const accountMatches = details.receiverAccount === envReceiverAccount ||
      (details.receiverAccount && envReceiverAccount && details.receiverAccount.endsWith(envReceiverAccount));
    if(details.receiverName !== envReceiverName || !accountMatches) {





      return res.status(400).json({
        error: "Invalid receiver or account",
      });
    }

    let transaction, deposit;

    try {
      // 💾 Save transaction
      transaction = await prisma.transaction.create({
        data: {
          userId: Number(userId),
          amount: details.amount,
          transactionId,
          paymentDateTime: details.date,
          receiver: details.receiverName,
          account: details.receiverAccount,
        },
      });

      // 📥 Save deposit
      deposit = await prisma.depositRequest.create({
        data: {
          userId: Number(userId),
          amount: details.amount,
          transactionId,
          paymentDateTime: details.date,
          receiver: details.receiverName,
          account: details.receiverAccount,
          status: "approved",
        },
      });

      // 💰 Update balance
      await prisma.userBalance.upsert({
        where: { userId: Number(userId) },
        update: {
          currentBalance: { increment: details.amount },
          totalDeposits: { increment: details.amount },
        },
        create: {
          userId: Number(userId),
          currentBalance: details.amount,
          totalDeposits: details.amount,
        },
      });

      await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          rewardBalance: { increment: Math.floor(details.amount * 0.1) },
        },
      });

    } catch (err) {
      if (
        err.code === "P2002" &&
        err.meta?.target?.includes("transactionId")
      ) {
        return res.status(409).json({
          error: "Duplicate transaction (DB constraint)",



        });
      }
      throw err;
    }


    return res.json({
      success: true,
      transaction,
      deposit,
    });

  } catch (err) {
    console.error("❌ CBE Birr endpoint error:", err);

    return res.status(500).json({
      error: "Failed to process CBE Birr",
    });
  }
});

export default router;
