import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ACTION_STATUS,
  initiateOperationalAction,
  readActionRecords,
  readActivityEntries,
  subscribeToOperationalActions,
} from "@/lib/caseActionStore";

const EMPTY = { records: [], activities: [], isReady: false };

/**
 * Reads persisted operational action state for a case (and optionally a single
 * ATM) out of the action store, and keeps it fresh when anything writes to it.
 *
 * @param {object} options
 * @param {string} options.caseId Case the records must belong to.
 * @param {string} [options.atmId] When set, records are narrowed to that ATM.
 * @returns {{records: object[], activities: object[], isReady: boolean, getRecord: Function, getStatus: Function, initiate: Function}}
 */
export function useCaseActions({ caseId, atmId } = {}) {
  const [state, setState] = useState(EMPTY);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!caseId) {
      setState({ records: [], activities: [], isReady: true });
      return;
    }

    const [records, activities] = await Promise.all([
      readActionRecords({ caseId, atmId }),
      readActivityEntries({ caseId }),
    ]);

    // Ignore results from a superseded request (case/ATM switched mid-read).
    if (requestId === requestIdRef.current) {
      setState({ records, activities, isReady: true });
    }
  }, [caseId, atmId]);

  useEffect(() => {
    refresh();
    return subscribeToOperationalActions(refresh);
  }, [refresh]);

  // Records arrive newest first, and one action type can exist for several ATMs
  // in the same case, so the first hit is the most recently initiated one.
  const recordsByType = useMemo(() => {
    const map = new Map();
    state.records.forEach((record) => {
      if (!map.has(record.actionType)) map.set(record.actionType, record);
    });
    return map;
  }, [state.records]);

  /** Persisted record for an action type, or null when it has never been initiated. */
  const getRecord = useCallback((actionType) => recordsByType.get(actionType) ?? null, [recordsByType]);

  /** "pending" until a record exists — drives the PENDING / ACTIVE badge text. */
  const getStatus = useCallback(
    (actionType) => getRecord(actionType)?.status ?? ACTION_STATUS.pending,
    [getRecord]
  );

  /** Confirming an action. Writes through the store, which notifies this hook. */
  const initiate = useCallback(
    (payload) => initiateOperationalAction({ ...payload, caseId, atmId }),
    [caseId, atmId]
  );

  return { ...state, getRecord, getStatus, initiate, refresh };
}

export default useCaseActions;
