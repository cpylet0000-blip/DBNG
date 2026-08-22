import { useState, useEffect, useMemo, useRef } from "react";
import { useProfile } from "../profileContext";
import { useDepositMethods } from "../contexts/DepositMethodsContext";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  ChevronDown,
} from "lucide-react";

type HistoryItem = {
  transactionId: string;
  id: number;
  amount: number;
  status: string;
  createdAt: string;
};

type DepositMethod = {
  name: string;
  accountInfo: string;
  accountOwner?: string;
  isActive: boolean;
};

const ERROR_TIMEOUT = 10000;

const Deposit = () => {
  const { profile } = useProfile();
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const { depositMethods, methodsLoading } = useDepositMethods();
  const sortedDepositMethods = useMemo(() => {
    if (!depositMethods || depositMethods.length === 0) return [];
    const cbeIndex = depositMethods.findIndex((m) =>
      m.name.toLowerCase().includes("cbe"),
    );
    if (cbeIndex <= 0) return depositMethods;
    const cbe = depositMethods[cbeIndex];
    return [
      cbe,
      ...depositMethods.slice(0, cbeIndex),
      ...depositMethods.slice(cbeIndex + 1),
    ];
  }, [depositMethods]);

  useEffect(() => {
    if (!selectedMethod && sortedDepositMethods.length > 0) {
      const activeMethod = sortedDepositMethods.find((m) => m.isActive);
      const cbe = sortedDepositMethods.find((m) =>
        m.name.toLowerCase().includes("cbe"),
      );
      setSelectedMethod(activeMethod || cbe || sortedDepositMethods[0]);
    }
  }, [selectedMethod, sortedDepositMethods]);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [smsText, setSmsText] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  const errorTimerRef = useRef<number | null>(null);

  const botUrl = import.meta.env.VITE_TG_BOT_URL;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const showError = (msg: string) => {
    const translate = (text: string) => {
      if (!text) return text;
      // common backend messages -> Amharic
      if (text.includes("This transaction has already been approved"))
        return "ይህ ግብይት ቀድሞ ተፈፅሟል።";
      if (
        text.includes("Missing userId") ||
        text.includes("Missing userId or transactionId")
      )
        return "userId ወይም transactionId የለም።";
      if (text.includes("Transaction details not found"))
        return "የግብይት ዝርዝር አልተገኘም።";
      if (text.includes("Failed to submit deposit request"))
        return "የገቢ ጥያቄ ማስገባት አልተሳካም።";
      if (
        text.includes("You have a pending deposit request") ||
        text.includes("You have a pending deposit request")
      )
        return "ያልተጠናቀቀ የገቢ ጥያቄ አለዎት፣ እባክዎ እስኪጠናቀቅ በትዕግስት ይጠብቁን።";
      // if already in Amharic, return as-is
      if (/[\u1200-\u137F]/.test(text)) return text;
      return text; // fallback: show original
    };

    setError(translate(msg));
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      setError(null);
    }, ERROR_TIMEOUT);
  };

  const hasActiveMethods = useMemo(
    () => depositMethods.some((m) => m.isActive),
    [depositMethods],
  );

  const hasPending = useMemo(
    () => history.some((h) => h.status === "pending"),
    [history],
  );

  const methodName = selectedMethod?.name.toLowerCase() ?? "";
  const walletPattern =
    /(?:cbe|ceb)\s*birr|cbebirr|cebbirr|cbe-birr|ceb-birr|(?:e|ebirr)\s*birr|ebirr|e-birr/;

  const isTelebirr = methodName.includes("tele");
  const isBoa = methodName.includes("boa");
  const isCbeBirr = /(?:cbe|ceb)\s*birr|cbebirr|cebbirr|cbe-birr|ceb-birr/.test(
    methodName,
  );
  const isEbirr = /(?:e|ebirr)\s*birr|ebirr|e-birr/.test(methodName);
  const isCbe = methodName.includes("cbe") && !isCbeBirr;

  useEffect(() => {
    if (!smsText) return;
    if (!selectedMethod) return;
    const key = selectedMethod.name.toLowerCase();
    const shouldParse =
      key.includes("tele") ||
      key.includes("boa") ||
      walletPattern.test(key) ||
      key.includes("cbe");

    if (!shouldParse) return;

    const id =
      extractTelebirrTransactionId(smsText) ||
      extractBoaTransactionId(smsText) ||
      extractCbeBirrTxnIdOnly(smsText) ||
      extractCbeTransactionId(smsText, selectedMethod.accountInfo);
    const amt =
      key.includes("tele") || key.includes("boa") || walletPattern.test(key)
        ? extractAmount(smsText)
        : null;

    if (id) setTransactionId(id);
    if (amt) setAmount(amt);
  }, [smsText, selectedMethod]);

  const parseSmsNow = (text?: string) => {
    const value = text ?? smsText ?? "";
    if (!value || !selectedMethod) return;
    const key = selectedMethod.name.toLowerCase();
    const shouldParse =
      key.includes("tele") ||
      key.includes("boa") ||
      walletPattern.test(key) ||
      key.includes("cbe");

    if (!shouldParse) return;

    const id =
      extractTelebirrTransactionId(value) ||
      extractBoaTransactionId(value) ||
      extractCbeBirrTxnIdOnly(value) ||
      extractCbeTransactionId(value, selectedMethod.accountInfo);
    const amt =
      key.includes("tele") || key.includes("boa") || walletPattern.test(key)
        ? extractAmount(value)
        : null;

    if (id) setTransactionId(id);
    if (amt) setAmount(amt);
  };

  const canRequest =
    selectedMethod &&
    selectedMethod.isActive &&
    ((isTelebirr &&
      ((transactionId.trim().length > 0 &&
        amount !== "" &&
        !isNaN(Number(amount)) &&
        Number(amount) > 0) ||
        smsText.trim().length > 0)) ||
      (isBoa &&
        ((transactionId.trim().length > 0 &&
          amount !== "" &&
          !isNaN(Number(amount)) &&
          Number(amount) > 0) ||
          smsText.trim().length > 0)) ||
      (isEbirr &&
        ((transactionId.trim().length > 0 &&
          amount !== "" &&
          !isNaN(Number(amount)) &&
          Number(amount) > 0) ||
          smsText.trim().length > 0)) ||
      ((isCbe || isCbeBirr) && transactionId.trim().length > 0)) &&
    !hasPending &&
    !loading;

  const recentHistory = useMemo(() => {
    if (!history || history.length === 0) return [] as HistoryItem[];
    return [...history]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3);
  }, [history]);

  const fetchHistory = async () => {
    if (!profile?.id) return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch(
        `${BACKEND_URL}/depositer/history?userId=${profile.id}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      setHistoryError("የገቢ ታሪክን ማንበብ አልተቻለም።");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [profile?.id]);

  const requestDeposit = async () => {
    if (!selectedMethod || !selectedMethod.isActive) {
      showError("እባክዎ የክፍያ ዘዴ ይምረጡ።");
      return;
    }

    const parsedTxIdFromSms =
      extractCbeBirrTxnIdOnly(smsText) ||
      extractTelebirrTransactionId(smsText) ||
      extractBoaTransactionId(smsText) ||
      extractCbeTransactionId(smsText, selectedMethod.accountInfo);

    const resolvedTransactionId = (
      transactionId ||
      parsedTxIdFromSms ||
      ""
    ).trim();
    const resolvedAmount =
      amount !== "" && amount !== null && amount !== undefined
        ? Number(amount)
        : (extractAmount(smsText) ?? 0);

    if (!resolvedTransactionId) {
      showError("እባክዎን መጀመሪያ የግብይት መለያ (Transaction ID) ያስገቡ");
      return;
    }
    if (
      (isTelebirr || isBoa || isCbeBirr || isEbirr) &&
      (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0)
    ) {
      showError("እባክዎን የገቢ መጠን (Amount) ያስገቡ");
      return;
    }
    if (hasPending) {
      showError("ያልተጠናቀቀ የገቢ ጥያቄ አለዎት፣ እባክዎ እስኪጠናቀቅ በትዕግስት ይጠብቁን።");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let endpoint = `${BACKEND_URL}/depositer`;
      let txId = resolvedTransactionId;
      let body: any = { userId: profile?.id };

      // 1️⃣ Detect payment method from SMS content first
      const detectedMethod = detectPaymentMethodFromSMS(smsText);
      const methodToUse = detectedMethod || (selectedMethod?.name ?? "");
      const methodKey = methodToUse.toLowerCase();

      // 2️⃣ Determine endpoint based on actual method
      if (methodKey.includes("tele")) {
        endpoint = `${BACKEND_URL}/depositer/tele`;
        body.transactionId = txId;
        body.amount = Number(resolvedAmount);
      } else if (methodKey.includes("boa")) {
        endpoint = `${BACKEND_URL}/depositer/tele`;
        body.transactionId = txId;
        body.amount = Number(resolvedAmount);
      } else if (
        methodKey.includes("cbebirr") ||
        methodKey.includes("cbe birr")
      ) {
        const lbExtracted =
          extractCbeBirrTxnIdOnly(txId || smsText) ||
          extractCbeBirrTxnIdOnly(smsText) ||
          txId;

        if (!lbExtracted) {
          showError("እባክዎ የተገባ የSMS ወይም የTransaction ID ያጥፉ።");
          setLoading(false);
          return;
        }

        endpoint = `${BACKEND_URL}/depositer/cbe-birr`;
        txId = lbExtracted;
        body.transactionId = txId;
        body.amount = Number(resolvedAmount || 0);

        const phoneNumber = extractCbeBirrPhoneNumber(smsText || txId);
        if (phoneNumber) {
          body.phoneNumber = phoneNumber;
        }
      } else if (methodKey.includes("ebirr")) {
        const ebirrExtracted =
          extractEbirrTransactionId(txId || smsText) ||
          extractEbirrTransactionId(smsText) ||
          txId;

        if (!ebirrExtracted) {
          showError("እባክዎ የተገባ የSMS ወይም የTransaction ID ያጥፉ።");
          setLoading(false);
          return;
        }

        endpoint = `${BACKEND_URL}/depositer/ebirr`;
        txId = ebirrExtracted;
        body.transactionId = txId;
        body.amount = Number(resolvedAmount || 0);
      } else if (methodKey.includes("cbe")) {
        const cbeExtracted = extractCbeTransactionId(
          txId,
          selectedMethod?.accountInfo,
        );

        if (!cbeExtracted) {
          showError("እባክዎ ትክክለኛውን SMS ወይም ID እንደተገጠሙ ያረጋግጡ።");
          setLoading(false);
          return;
        }

        txId = cbeExtracted;
        body.transactionId = txId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "የገቢ ጥያቄ ማስገባት አልተሳካም።");
        setTransactionId("");
        setAmount("");
        setSmsText("");
        return;
      }
      setSuccess(true);
      setTransactionId("");
      setAmount("");
      setSmsText("");
      fetchHistory();
      setTimeout(() => setSuccess(false), ERROR_TIMEOUT);
    } catch {
      showError("የገቢ ጥያቄ ማስገባት አልተሳካም።");
      setTransactionId("");
      setAmount("");
      setSmsText("");
    } finally {
      setLoading(false);
    }
  };

  const extractAmount = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    // 1️⃣ BOA Amharic (expense)
    const boa = clean.match(/ብር\s*([\d,]+(?:\.\d{1,2})?)\s*ወጪ/);
    if (boa) return Number(boa[1].replace(/,/g, ""));

    // 2️⃣ ✅ Telebirr Amharic (amount BEFORE "ብር")
    const telebirrAmharic = clean.match(/([\d,]+(?:\.\d{1,2})?)\s*ብር/);
    if (telebirrAmharic) {
      return Number(telebirrAmharic[1].replace(/,/g, ""));
    }

    // 3️⃣ English: transferred ETB XXX
    const transfer = clean.match(/transferred\s*ETB\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (transfer) {
      return Number(transfer[1].replace(/,/g, ""));
    }

    // 4️⃣ Ebirr wallet SMS: "You sent ETB5" / "You sent ETB 5" / "Bonus890 ETB 377.00 ETBDeposit"
    const ebirrSent = clean.match(
      /(?:sent|paid)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)(?:\s*(?:ETB|Br|Birr|ብር))?/i,
    );
    if (ebirrSent) return Number(ebirrSent[1].replace(/,/g, ""));

    // 5️⃣ CBEBirr wallet SMS: "you have sent 205.00Br"
    const cbebirr = clean.match(
      /(?:sent|paid|transfer(?:red)?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Br|Birr|ብር)/i,
    );
    if (cbebirr) return Number(cbebirr[1].replace(/,/g, ""));

    // 6️⃣ Prefer the last valid ETB/Birr amount so bonus text and trailing Balance do not override the real transfer amount.
    const amountMatches = [
      ...clean.matchAll(/([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Br|Birr|ብር)/gi),
    ];
    if (amountMatches.length > 0) {
      const lastMatch = amountMatches[amountMatches.length - 1];
      return Number(lastMatch[1].replace(/,/g, ""));
    }

    // 7️⃣ Fallback: first ETB
    const all = [...clean.matchAll(/ETB\s*([\d,]+(?:\.\d{1,2})?)/gi)];
    if (all.length > 0) {
      return Number(all[all.length - 1][1].replace(/,/g, ""));
    }

    return null;
  };

  // ✅ TELEBIRR
  const extractTelebirrTransactionId = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    // 1️⃣ English SMS
    const eng = clean.match(/transaction number is\s*([A-Z0-9]{8,15})/i);
    if (eng) return eng[1].toUpperCase();

    // 2️⃣ URL (works for both)
    const url = clean.match(/receipt\/([A-Z0-9]{8,15})/i);
    if (url) return url[1].toUpperCase();

    // 3️⃣ ✅ Amharic SMS (THIS IS YOUR FIX)
    const amharic = clean.match(/ቁጥርዎ\s*([A-Z0-9]{8,15})/);
    if (amharic) return amharic[1].toUpperCase();

    // 4️⃣ Backup: any standalone ID like DCO36X8CEZ
    const fallback = clean.match(/\b[A-Z0-9]{10}\b/);
    if (fallback) return fallback[0].toUpperCase();

    return null;
  };

  // ✅ EBIRR - Extract the receipt token from URL
  const extractEbirrTransactionId = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    // Extract from ebirr.com URL pattern: receipt.ebirr.com/kaafimf/Ubc4NLz2nuqPyBmiBYinOA
    const urlMatch = clean.match(
      /receipt\.ebirr\.com\/[^\s/]+\/([A-Za-z0-9_\-]+)/i,
    );
    if (urlMatch) return urlMatch[1];

    // Fallback: look for the token pattern in the text (alphanumeric with underscores, 20+ chars)
    const tokenMatch = clean.match(/([A-Za-z0-9_\-]{20,})/);
    if (tokenMatch) return tokenMatch[1];

    return null;
  };

  // ✅ BOA
  const extractBoaTransactionId = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    // 1. BEST → trx=FT...
    const urlMatch = clean.match(/trx=(FT[A-Z0-9]{10,20})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    // 2. fallback → FT...
    const ftMatch = clean.match(/\bFT[A-Z0-9]{14,20}\b/);
    if (ftMatch) return ftMatch[0].toUpperCase();

    return null;
  };

  // Extract CBE transaction ID from SMS or input, merging with account if needed
  const extractCbeTransactionId = (text: string, accountInfo?: string) => {
    if (!text) return null;

    // 2️⃣ Try to extract from URL (most reliable source)
    const urlMatch = text.match(/id=(FT[A-Z0-9]+)/);
    if (urlMatch && urlMatch[1].length >= 16) {
      return urlMatch[1];
    }
    // 1️⃣ Try to extract FULL transaction ID (starts with FT and long enough)
    const fullMatch = text.match(/\bFT[A-Z0-9]{14,18}\b/);
    if (fullMatch) {
      return fullMatch[0];
    }

    // 3️⃣ Try to extract REF (short one) like: FT260765L60N
    const refMatch = text.match(/\bFT[A-Z0-9]{8,14}\b/);

    if (refMatch) {
      const ref = refMatch[0];

      // If we have account info → build full ID
      if (accountInfo) {
        const digits = accountInfo.replace(/\D/g, "");
        const last8 = digits.slice(-8);

        if (last8.length === 8) {
          return ref + last8;
        }
      }

      // fallback: return ref if we can't complete it
      return ref;
    }

    // 4️⃣ Last fallback: if user pasted only the ID
    if (/^FT[A-Z0-9]{14,18}$/.test(text.trim())) {
      return text.trim();
    }

    return null;
  };

  const handleCopyAccount = async (acct: string) => {
    try {
      await navigator.clipboard.writeText(acct);
      setCopiedAccount(acct);
      setTimeout(() => setCopiedAccount(null), 1200);
    } catch {
      /* silent */
    }
  };
  const extractCbeBirrTxnIdOnly = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    const patterns = [
      /(?:Txn|Transaction)\s*(?:ID|Id|id)?\s*[:=]?\s*([A-Z0-9]{8,40})/i,
      /(?:^|[\s>\-])(?:Id|ID)\s*[:=]?\s*([A-Z0-9]{8,40})\b/i,
      /(?:^|[\s>\-])Transaction\s*Id\s*[:=]?\s*([A-Z0-9]{8,40})\b/i,
      /(?:TID|tid)=([A-Z0-9]{8,40})/i,
      /aureceipt\?TID=([A-Z0-9]{8,40})/i,
      /receipt\.ebirr\.com\/(?:[^\s/]+\/)?([A-Z0-9]{8,40})/i,
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) return match[1].toUpperCase();
    }

    const direct = clean.match(/\bD[A-Z0-9]{7,19}\b/i);
    if (direct) return direct[0].toUpperCase();

    return null;
  };

  const extractCbeBirrPhoneNumber = (text: string) => {
    if (!text) return null;

    const clean = text.replace(/\s+/g, " ");

    const patterns = [
      /PH=(\d+)/i,
      /phone[:\s=]*(\d+)/i,
      /account balance is[^0]*(\d{9,})/i,
      /(0?9\d{8})/,
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) {
        let phone = match[1];
        // Normalize: Remove leading 0, ensure it starts with 251
        if (phone.startsWith("251")) {
          return phone; // Already has country code
        }
        if (phone.startsWith("0")) {
          phone = phone.substring(1); // Remove leading 0
        }
        return "251" + phone; // Add country code
      }
    }

    return null;
  };

  // Detect payment method from SMS content
  const detectPaymentMethodFromSMS = (
    smsText: string,
  ): "CBEBirr" | "Ebirr" | "Telebirr" | null => {
    if (!smsText) return null;

    const text = smsText.toLowerCase();

    // Check for CBEBirr first (most specific)
    if (text.includes("cbe birr") || text.includes("cbepay")) {
      return "CBEBirr";
    }

    // Check for Telebirr BEFORE Ebirr (because "telebirr" contains "ebirr")
    if (text.includes("telebirr") || text.includes("ethiotelecom")) {
      return "Telebirr";
    }

    // Check for Ebirr (but not CBE Birr)
    if (text.includes("ebirr") && !text.includes("cbe")) {
      return "Ebirr";
    }

    return null;
  };
  /* =========================
     UI
  ========================= */
  return (
    <div className="w-full max-w-2xl mx-auto py-3 space-y-3 h-[78vh] overflow-y-auto bg-[#141415] text-slate-400 flex flex-col justify-center ">
      {/* PAYMENT METHODS */}
      <div
        className="bg-[#0f0f0f]  rounded-md  py-2 space-y-3 min-h-[30vh] "
        tabIndex={-1}
        onClick={(e) => {
          // Switch method if click outside a method card or copy icon
          const target = e.target as HTMLElement;
          if (
            !target.closest(".method-card") &&
            !target.closest(".copy-icon")
          ) {
            const cbe = depositMethods.find((m) =>
              m.name.toLowerCase().includes("cbe"),
            );
            setSelectedMethod(cbe || depositMethods[0] || null);
          }
        }}
      >
        <h2 className="text-sm font-semibold text-slate-200 text-center flex items-center justify-center gap-1 mb-5">
          የመክፈያ ዘዴን ይምረጡ
        </h2>

        {methodsLoading ? (
          <div className="flex justify-center items-center gap-1 py-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        ) : (
          <>
            <style>{`
              .methods-scrollbar { overflow-x: auto; scrollbar-width: thin; scrollbar-color: #f59e0b transparent; -webkit-overflow-scrolling: touch; }
              .methods-scrollbar::-webkit-scrollbar { height: 3px; }
              .methods-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .methods-scrollbar::-webkit-scrollbar-thumb { background: #f59e0b; border-radius: 9999px; }
            `}</style>
            <div className="methods-scrollbar flex flex-wrap justify-center gap-3 p-3">
              {sortedDepositMethods.map((m, i) => {
                const key = m.name.toLowerCase();
                let img = "/abyssinia.jpg";
                if (key.includes("tele")) img = "/Telebirr.png";
                else if (
                  key.includes("cbe birr") ||
                  key.includes("cbe-birr") ||
                  key.includes("cbe birr")
                )
                  img = "/CBEbirr.png";
                else if (
                  key.includes("m-pesa") ||
                  key.includes("mpesa") ||
                  key.includes("m pesa")
                )
                  img = "/m-pesa.png";
                else if (key.includes("ebirr") || key.includes("e-birr"))
                  img = "/Ebirr.png";
                const isSelected =
                  selectedMethod && selectedMethod.name === m.name;
                return (
                  <div
                    key={i}
                    className={`
    method-card group relative rounded-xl h-24 w-24
    flex items-center justify-center overflow-hidden
    transition-all duration-300 cursor-pointer
    border-[1.5px] border-slate-800
    ${!m.isActive ? "opacity-40 cursor-not-allowed" : ""}

    ${
      isSelected
        ? "scale-105 shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
        : "shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
    }
  `}
                    style={{
                      backgroundImage: `url(${img})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      transformStyle: "preserve-3d",
                    }}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest(".copy-icon")) {
                        e.stopPropagation();
                        if (m.isActive) {
                          setSelectedMethod(m);
                          setShowAccountModal(true);
                          setTransactionId("");
                          setAmount("");
                          setError(null);
                        }
                      }
                    }}
                  >
                    {/* GLOW WHEN SELECTED */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-xl border-[1.5px] border-blue-600 shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
                    )}

                    {/* HOVER 3D EFFECT */}
                    <div className="absolute inset-0 rounded-xl transition-transform duration-300 group-hover:scale-[1.03] group-hover:-translate-y-1" />

                    {/* TOP LIGHT (fake 3D highlight) */}
                    {/* <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" /> */}

                    {/* NAME */}

                    {/* STATUS DOT */}
                    <div
                      className={`absolute top-1 left-1 w-2 h-2 rounded-full ${
                        m.isActive ? "bg-green-400" : "bg-gray-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {/* ACCOUNT INFO MODAL */}
      {selectedMethod && selectedMethod.accountInfo && showAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 "
          onClick={() => setShowAccountModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm h-screen" />
          <div
            className="relative w-full max-w-md bg-gray-800/50 rounded-2xl shadow-xl p-5 z-10 border-[1.5px] border-blue-700/30 h-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full overflow-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-lg font-bold text-white text-center">
                  Mr {selectedMethod.accountOwner || selectedMethod.name}
                </h2>
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="text-blue-600 hover:text-blue-500 text-md font-bold "
                >
                  ✕
                </button>
              </div>

              {/* ACCOUNT BOX */}
              <div className="mt-4 bg-black border-[1.5px] border-slate-800  rounded-md py-1 px-2 flex justify-between items-center">
                <span
                  className={`text-md font-medium break-all transition-all duration-300 ${
                    copiedAccount === selectedMethod.accountInfo
                      ? "text-green-400"
                      : "text-white"
                  }`}
                >
                  {copiedAccount === selectedMethod.accountInfo
                    ? "✔ Copied"
                    : selectedMethod.accountInfo}
                </span>
                <button
                  onClick={() => handleCopyAccount(selectedMethod.accountInfo)}
                  className="text-xs px-3 py-1 rounded-md border-[1.5px] font-semibold transition text-blue-600"
                >
                  Copy
                </button>
              </div>

              {/* FORM */}
              {selectedMethod?.isActive &&
                (isTelebirr || isBoa || isCbe || isCbeBirr || isEbirr) && (
                  <div className="mt-4 space-y-4 ">
                    {/* TEXTAREA */}
                    <div>
                      <label className="text-sm text-gray-300 font-medium">
                        ሙሉ SMS ከዚህ በታች paste ያድርጉ።
                      </label>
                      <textarea
                        value={smsText}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSmsText(v);
                          setError(null);
                        }}
                        onInput={(e) => {
                          const v = (e.target as HTMLTextAreaElement).value;
                          setSmsText(v);
                          setError(null);
                          // attempt parse on input for mobile reliability
                          parseSmsNow(v);
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          setSmsText(pasted);
                          setError(null);
                          parseSmsNow(pasted);
                          e.preventDefault();
                        }}
                        onBlur={() => parseSmsNow()}
                        placeholder="Paste SMS here..."
                        className="w-full h-[100px] mt-1 border-[1.5px] border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:border-blue-600 outline-none bg-black"
                      />
                      {/* Mobile fallback: parse & enable submit manually */}
                      {/* fallback removed; parsing runs on input/paste/blur */}
                    </div>
                    {/* AMOUNT */}
                    {(isTelebirr || isBoa || isCbeBirr || isEbirr) && (
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) =>
                          setAmount(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="Enter amount"
                        min={1}
                        className="w-35 border-[1.5px] border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-600 outline-none bg-black"
                      />
                    )}
                    {/* BUTTON */}
                    <button
                      onClick={requestDeposit}
                      disabled={!canRequest}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition
              ${
                canRequest
                  ? "bg-blue-500 text-black hover:bg-blue-600"
                  : "bg-slate-800 text-slate-500"
              }`}
                    >
                      {loading ? "Processing..." : "Submit"}
                    </button>

                    {/* ERROR */}
                    {error && (
                      <div className="text-xs text-red-500">{error}</div>
                    )}

                    {/* SUCCESS */}
                    {success && (
                      <div className="text-xs text-green-600">
                        የገቢ ጥያቄዎ ተልኳል።
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
      {/* INSTRUCTIONS */}
      {/* <div className="bg-[#0f0f0f] border-b-2 border-slate-900 rounded-md p-3 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-1 text-slate-400 font-semibold">
          ገንዘብ እንዴት እንደሚያስገቡ
        </div>

        <div className="text-slate-400">
          1. የሚመችዎትን የክፍያ መንገድ (ቴሌብር፣ የኢትዮጵያ ንግድ ባንክ...) ይምረጡ። ቁጥሩን "Copy" የሚለውን
          ቁልፍ ተጭነው መውሰድ ይችላሉ።
          <br />
          2. ክፍያውን ካጠናቀቁ በኋላ፣ ከቴሌብር ወይም ከባንክ የመጣውን ሙሉ SMS ኮፒ አድርገው paste ያድርጉ።
          <br />
          3. የገቢ ጥያቄ ይላኩ።
          <br />
          4. እርዳታ ካስፈለገ{" "}
          <a
            href={import.meta.env.VITE_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            @ድጋፍ ያግኙ
          </a>
        </div>
      </div> */}

      {/* TRANSACTIONS / HISTORY */}
      <div className="bg-[#0f0f0f] border border-slate-900 rounded-md p-3 space-y-2">
        {/* HEADER (CLICKABLE) */}
        <div
          onClick={() => setShowTransactions((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <h2 className="text-sm font-semibold text-slate-400">Transactions</h2>

          {/* ARROW */}
          <span
            className={`text-xs transition-transform duration-300 ${
              showTransactions ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={16} className="text-slate-400" />
          </span>
        </div>

        {/* CONTENT */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showTransactions
              ? "max-h-[400px] opacity-100 mt-2"
              : "max-h-0 opacity-0"
          }`}
        >
          {historyLoading ? (
            <div className="flex justify-center py-3">
              <RefreshCw className="animate-spin text-blue-500" size={18} />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center">
              No transactions history. Make your first deposit!
            </p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-black p-[4px] text-xs rounded-md "
                >
                  <div className="flex justify-between text-slate-400 font-semibold text-xs">
                    <span className="truncate text-xs">
                      TX: {tx.transactionId}
                    </span>
                    <span className="text-blue-400">{tx.amount} ETB</span>
                  </div>

                  <div className="flex justify-between text-slate-400 mt-1">
                    <span
                      className={
                        tx.status === "approved"
                          ? "text-green-400"
                          : tx.status === "pending"
                            ? "text-yellow-400"
                            : "text-red-400"
                      }
                    >
                      {tx.status}
                    </span>

                    <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {/* OPTIONAL VIEW MORE */}
              {history.length > 3 && (
                <button className="w-full text-xs text-blue-400 mt-2 hover:underline">
                  View full history
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Deposit;
