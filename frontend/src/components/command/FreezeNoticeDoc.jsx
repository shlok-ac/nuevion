import { forwardRef } from "react";
import { formatINR } from "@/lib/investigationData";

const FreezeNoticeDoc = forwardRef(function FreezeNoticeDoc({ data: d }, ref) {
  return (
    <div ref={ref} id="freeze-notice-print" className="mx-auto max-w-[800px] bg-white p-10 text-[13px] leading-relaxed text-slate-900">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Government of India · Ministry of Home Affairs</p>
          <h1 className="mt-1 text-xl font-bold">Cyber Crime Investigation Unit</h1>
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
          Subject: Direction for freezing of bank account under Section 106, Bharatiya Nagarik Suraksha Sanhita, 2023 — Reg.
        </p>
      </div>

      <p className="mt-4">Sir/Madam,</p>
      <p className="mt-3">
        Pursuant to FIR {d.firNo} registered at {d.station}, the undersigned is investigating a cyber-enabled financial fraud
        wherein an amount of <strong>{formatINR(d.amount)}</strong> has been traced to the following account held with your
        bank, identified as proceeds of crime:
      </p>

      <table className="mt-4 w-full border border-slate-400 text-[12px]">
        <tbody>
          <Row k="Account Holder" v={d.accountHolder} />
          <Row k="Account Number" v={d.account} />
          <Row k="Bank / Branch" v={`${d.bank}, ${d.branch}`} />
          <Row k="Amount to be frozen" v={formatINR(d.amount)} />
          <Row k="Linked FIR" v={d.firNo} />
          <Row k="Victim" v={d.victim} />
        </tbody>
      </table>

      <p className="mt-4">
        In exercise of the powers conferred under <strong>Section 106 of the Bharatiya Nagarik Suraksha Sanhita, 2023</strong>{" "}
        and the provisions of the Information Technology Act, 2000 read with the relevant RBI / cybercrime guidelines, you are
        hereby directed to <strong>place a lien / freeze</strong> on the above account and all linked accounts with immediate
        effect, and to <strong>not permit any debit, transfer or withdrawal</strong> therefrom until further written order
        from this office.
      </p>
      <p className="mt-3">
        The freeze shall be effected <strong>silently</strong> — the account holder shall continue to see the available balance
        in the customer-facing application without any indication that the account is under restraint, and outward
        transactions shall remain in a perpetual &quot;processing&quot; state pending our further intimation.
      </p>
      <p className="mt-3">
        You are requested to acknowledge receipt and confirm compliance within 2 (two) hours, and to share the account
        statement for the preceding 90 days along with KYC particulars of the holder.
      </p>

      <div className="mt-10 flex justify-end">
        <div className="text-center">
          <p className="font-semibold">{d.officer}</p>
          <p className="text-xs">Investigating Officer</p>
          <p className="text-xs">{d.station}</p>
        </div>
      </div>
      <p className="mt-6 border-t pt-2 text-[10px] text-slate-500">
        This is a system-generated notice from the CyberFraud Command Center. Unauthorised disclosure to the account holder
        may prejudice the investigation.
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