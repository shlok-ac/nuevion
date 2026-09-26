import { useEffect, useState } from "react";
import { Wallet, Send, ArrowLeft, Loader2, Building2, CheckCircle2, XCircle } from "lucide-react";
import { formatINR } from "@/lib/investigationData";

export default function BankAppSim({ mode = "normal" }) {
  const [screen, setScreen] = useState("home");
  const [amount, setAmount] = useState("");
  const balance = 1542300;

  useEffect(() => {
    setScreen("home");
    setAmount("");
  }, [mode]);

  const send = (e) => {
    e.preventDefault();
    if (mode === "freeze") setScreen("processing");
    else if (mode === "error") setScreen("error");
    else setScreen("success");
  };

  return (
    <div className="mx-auto w-[280px]">
      <div className="rounded-[2rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-xl">
        <div className="overflow-hidden rounded-[1.5rem] bg-white">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-1 text-[10px] text-white">
            <span>9:41</span>
            <span>•••• 4G</span>
          </div>

          {screen === "home" && (
            <div className="p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-semibold">SafeBank</span>
              </div>
              <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
                <p className="text-xs opacity-80">Available balance</p>
                <p className="text-2xl font-bold">{formatINR(balance)}</p>
                <p className="mt-1 text-[10px] opacity-80">A/C ••••1234</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScreen("send")}
                  className="flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium hover:bg-slate-50"
                >
                  <Send className="h-4 w-4 text-blue-600" /> Send Money
                </button>
                <button className="flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium hover:bg-slate-50">
                  <Wallet className="h-4 w-4 text-blue-600" /> Withdraw
                </button>
              </div>
              <p className="mt-4 text-[10px] text-slate-400">Last login: Today 09:38 · All systems normal</p>
            </div>
          )}

          {screen === "send" && (
            <form onSubmit={send} className="p-4">
              <button type="button" onClick={() => setScreen("home")} className="flex items-center gap-1 text-xs text-slate-500">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <p className="mt-3 text-sm font-semibold text-slate-800">Send Money</p>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (₹)"
                inputMode="numeric"
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                placeholder="Recipient UPI / A/c"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="submit" className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white">
                Send
              </button>
            </form>
          )}

          {screen === "processing" && (
            <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 320 }}>
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="mt-4 text-sm font-medium text-slate-800">Processing your transaction…</p>
              <p className="mt-1 text-xs text-slate-500">Please don't close the app.</p>
              <div className="mt-6 w-full rounded-lg bg-slate-50 p-3 text-left text-[10px] text-slate-400">
                <p>Available balance: {formatINR(balance)}</p>
                <p>Transaction status: in progress</p>
              </div>
            </div>
          )}

          {screen === "success" && (
            <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 320 }}>
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-medium text-slate-800">Sent successfully</p>
              <p className="text-xs text-slate-500">{amount ? formatINR(Number(amount)) : formatINR(0)} transferred</p>
              <div className="mt-6 w-full rounded-lg bg-slate-50 p-3 text-left text-[10px] text-slate-400">
                <p>Available balance: {formatINR(balance - (Number(amount) || 0))}</p>
                <p>Status: success</p>
              </div>
              <button onClick={() => setScreen("home")} className="mt-4 text-xs text-blue-600">
                Back to home
              </button>
            </div>
          )}

          {screen === "error" && (
            <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 320 }}>
              <XCircle className="h-10 w-10 text-red-500" />
              <p className="mt-3 text-sm font-medium text-slate-800">Transaction declined</p>
              <p className="text-xs text-slate-500">Please contact your branch.</p>
              <button onClick={() => setScreen("home")} className="mt-4 text-xs text-blue-600">
                Back to home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}