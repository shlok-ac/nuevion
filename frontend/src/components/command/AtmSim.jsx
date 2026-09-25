import { useEffect, useState } from "react";
import { Loader2, CreditCard, XCircle, Banknote } from "lucide-react";

const STEPS = ["Insert card", "Enter PIN", "Select account", "Enter amount", "Processing"];
const PROCESS_MSGS = [
  "Processing your transaction. Please wait…",
  "Verifying with bank…",
  "Please wait a moment longer…",
  "Counting cash…",
  "Almost done, please wait…",
];

export default function AtmSim({ mode = "normal" }) {
  const [step, setStep] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    setStep(0);
    setMsgIdx(0);
  }, [mode]);

  useEffect(() => {
    if (step < 4) {
      const t = setTimeout(() => setStep((s) => s + 1), 1100);
      return () => clearTimeout(t);
    }
    if (step === 4 && mode === "freeze") {
      const t = setInterval(() => setMsgIdx((i) => (i + 1) % PROCESS_MSGS.length), 1800);
      return () => clearInterval(t);
    }
    if (step === 4 && mode !== "freeze") {
      const t = setTimeout(() => setStep(5), 1500);
      return () => clearTimeout(t);
    }
  }, [step, mode]);

  const reset = () => {
    setStep(0);
    setMsgIdx(0);
  };

  return (
    <div className="mx-auto w-[300px]">
      <div className="rounded-xl border-4 border-slate-700 bg-slate-800 p-3 shadow-xl">
        <div className="rounded-lg bg-emerald-950 p-4 text-emerald-300" style={{ minHeight: 280 }}>
          <div className="flex items-center justify-between text-[10px] opacity-70">
            <span>SafeBank ATM</span>
            <span>Hinjewadi · ID 4421</span>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 200 }}>
            {step < 4 ? (
              <>
                <CreditCard className="h-8 w-8" />
                <p className="mt-3 text-sm">{STEPS[step]}</p>
                <div className="mt-3 h-1 w-40 overflow-hidden rounded bg-emerald-900">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
              </>
            ) : step === 4 ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-3 text-sm">{PROCESS_MSGS[msgIdx]}</p>
                <p className="mt-1 text-[10px] opacity-60">Do not remove your card.</p>
              </>
            ) : mode === "error" ? (
              <>
                <XCircle className="h-8 w-8 text-red-400" />
                <p className="mt-3 text-sm">Transaction declined</p>
                <p className="mt-1 text-[10px] opacity-60">Please contact your branch.</p>
              </>
            ) : (
              <>
                <Banknote className="h-8 w-8" />
                <p className="mt-3 text-sm">Please take your cash</p>
                <p className="mt-1 text-[10px] opacity-60">₹10,000 dispensed</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <button onClick={reset} className="rounded bg-slate-600 px-3 py-1 text-[10px] text-white">
            Restart simulation
          </button>
        </div>
      </div>
    </div>
  );
}