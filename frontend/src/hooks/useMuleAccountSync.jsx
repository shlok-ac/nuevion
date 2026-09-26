import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BANK_SYNC_STATUS,
  markMuleAccountsSent,
  readBankSyncRecords,
  subscribeToMuleAccountSync,
} from "@/lib/muleAccountStore";

const EMPTY = { records: [], isReady: false };

/**
 * Reads persisted bank-sync state for the Mule Account Database and keeps it
 * fresh whenever anything writes to it.
 *
 * Risk and account status are deliberately not part of this hook — bank sync is
 * an independent concept, so it lives in its own store and never overwrites the
 * registry data itself.
 *
 * @returns {{records: object[], isReady: boolean, getStatus: Function, getRecord: Function, markSent: Function, sentCount: Function}}
 */
export function useMuleAccountSync() {
  const [state, setState] = useState(EMPTY);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const records = await readBankSyncRecords();

    // Ignore results from a superseded request.
    if (requestId === requestIdRef.current) {
      setState({ records, isReady: true });
    }
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToMuleAccountSync(refresh);
  }, [refresh]);

  const recordsByAccountId = useMemo(() => {
    const map = new Map();
    state.records.forEach((record) => map.set(record.accountId, record));
    return map;
  }, [state.records]);

  /** Persisted record for an account, or null when it has never been submitted. */
  const getRecord = useCallback((accountId) => recordsByAccountId.get(accountId) ?? null, [recordsByAccountId]);

  /** "PENDING" until a record exists — drives the Send / ✓ Sent table action. */
  const getStatus = useCallback(
    (accountId) => getRecord(accountId)?.status ?? BANK_SYNC_STATUS.pending,
    [getRecord]
  );

  /** Simulated submission. Writes through the store, which notifies this hook. */
  const markSent = useCallback((accountIds, options) => markMuleAccountsSent(accountIds, options), []);

  /** How many of the given accounts have already been submitted. */
  const sentCount = useCallback(
    (accountIds) => accountIds.filter((accountId) => getStatus(accountId) === BANK_SYNC_STATUS.sent).length,
    [getStatus]
  );

  return { ...state, getRecord, getStatus, markSent, sentCount, refresh };
}

export default useMuleAccountSync;
