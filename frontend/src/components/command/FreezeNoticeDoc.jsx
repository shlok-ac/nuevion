import { forwardRef } from "react";
import { formatINR } from "@/lib/investigationData";

const FreezeNoticeDoc = forwardRef(function FreezeNoticeDoc({ data: d }, ref) {
  return (
    <div ref={ref} id="freeze-notice-print" className="mx-auto max-w-[800px] bg-white p-10 text-[13px] leading-relaxed text-slate-900">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">Prototype only · not an issued notice</p>
          <h1 className="mt-1 text-xl font-bold">Cyber Fraud Command Center</h1>
          <p className="text-xs">{d.station}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold">Ref: {d.refNo}</p>
          <p>Date: {d.date}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-semibold">To,</p>
        <p className="font-semibold">{d.officerName || "The Nodal Officer"}</p>
        <p>{d.bank}</p>
        <p>{d.branch}</p>
        <p className="mt-1 text-xs text-slate-600">
          Subject: Prototype notice preview — not for service or account action.
        </p>
      </div>

      <p className="mt-4 font-bold text-red-700">Demonstration preview only. This document is not legal advice, an order, or a communication to a bank.</p>
      <p className="mt-3">
        The values below are case details supplied by the application or entered for preview. They do not establish that funds
        were traced to this account, that an account is involved in wrongdoing, or that a freeze has been authorized.
      </p>

      <table className="mt-4 w-full border border-slate-400 text-[12px]">
        <tbody>
          <Row k="Account Holder" v={d.accountHolder} />
          <Row k="Account Number" v={d.account} />
          <Row k="Bank / Branch" v={`${d.bank}, ${d.branch}`} />
          <Row k="Reported amount (not a freeze instruction)" v={d.amount ? formatINR(d.amount) : "Not provided"} />
          <Row k="Linked FIR" v={d.firNo} />
          <Row k="Victim" v={d.victim} />
        </tbody>
      </table>

      <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 font-semibold text-red-800">
        No account action is requested by this prototype. Do not serve, send, or rely on this preview as an official notice.
      </p>

      <div className="mt-10 flex justify-end">
        <div className="text-center">
          <p className="font-semibold">{d.officer}</p>
          <p className="text-xs">Investigating Officer</p>
          <p className="text-xs">{d.station}</p>
        </div>
      </div>
      <p className="mt-6 border-t pt-2 text-[10px] text-slate-500">
        Prototype preview generated from application data. It has not been reviewed, authorized, or sent by an investigating authority.
      </p>
    </div>
  );
});

function Row({ k, v }) {
  return (
    <tr className="border-b border-slate-300">
      <td className="w-1/3 border-r border-slate-300 bg-slate-50 px-2 py-1 font-medium">{k}</td>
      <td className="px-2 py-1">{v}</td>
    </tr>
  );
}

export default FreezeNoticeDoc;