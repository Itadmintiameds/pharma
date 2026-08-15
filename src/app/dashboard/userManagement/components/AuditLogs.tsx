"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/app/components/common/table/Table";
import { showToast } from "@/app/components/common/Toast";
import { formatDateTime } from "@/utils/formatDate";
import {
  getAuditLogsForUser,
  type AuditLogPage,
  type AuditLogRecord,
  type AuditScope,
} from "@/services/UserManagementService";

const PAGE_SIZE = 7;

/** `USER_UPDATED` → `User Updated`. Unknown actions still read as words. */
const actionLabel = (action?: string | null) =>
  (action || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ") || "—";

interface AuditLogsProps {
  /**
   * The user whose trail this is, as the audit records id them
   * ("USR-2026-00001"). Required: a trail with no user to scope it to would be
   * the whole organization's, which on a profile page reads as that person's
   * activity when it is somebody else's.
   */
  userId: string;
  /**
   * Which side of an entry to match on. ACTOR — what this user did — is what a
   * user's own audit tab is for; the server would otherwise default to ALL and
   * fold in everything done *to* them by someone else.
   */
  scope?: AuditScope;
}

const AuditLogs = ({ userId, scope = "ACTOR" }: AuditLogsProps) => {
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * The endpoint pages by cursor, so a page number alone cannot address a page.
   * Each page's starting cursor is kept as it is discovered — index 0 is the
   * first page, which has none — and that is what lets the numbered pager walk
   * in both directions.
   */
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  /** One page of this user's trail. */
  const fetchPage = useCallback(
    (cursor?: string): Promise<AuditLogPage> =>
      getAuditLogsForUser(userId, { size: PAGE_SIZE, cursor, scope }),
    [userId, scope]
  );

  const apply = useCallback((result: AuditLogPage, target: number) => {
    setRows(result.data);
    setHasMore(result.hasMore);
    setPage(target);

    const nextCursor =
      result.hasMore && result.nextCursor ? result.nextCursor : undefined;

    setCursors((known) => {
      // Landing on page 1 means a fresh trail — a new user, scope or filter —
      // so every cursor held for the old one is discarded rather than reused.
      if (target === 1) return nextCursor ? [undefined, nextCursor] : [undefined];

      // Otherwise just remember where the page after this one starts.
      if (!nextCursor) return known;
      const next = [...known];
      next[target] = nextCursor;
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    // Async from the first line, so nothing sets state while the effect body is
    // still running.
    (async () => {
      try {
        const result = await fetchPage(undefined);
        if (active) apply(result, 1);
      } catch (error) {
        console.error("Failed to fetch the audit logs", error);
        if (active) {
          showToast.error("Could not load the audit logs.");
          setRows([]);
          setHasMore(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // fetchPage changes with the user and the scope, so either starts the trail
    // again from its first page.
  }, [fetchPage, apply]);

  const goToPage = async (target: number) => {
    const cursor = cursors[target - 1];
    // A page whose cursor was never recorded cannot be jumped to.
    if (target > 1 && cursor === undefined) return;

    setLoading(true);
    try {
      apply(await fetchPage(cursor), target);
    } catch (error) {
      console.error("Failed to fetch the audit logs", error);
      showToast.error("Could not load the audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "createdAt",
      header: "Date & Time",
      render: (row: AuditLogRecord) => formatDateTime(row.createdAt),
    },
    {
      key: "actorName",
      header: "User",
      // The id is the fallback: an actor deleted since still has to be named.
      render: (row: AuditLogRecord) => row.actorName || row.actorUserId || "—",
    },
    {
      key: "action",
      header: "Action",
      render: (row: AuditLogRecord) => actionLabel(row.action),
    },
    {
      key: "details",
      header: "Details",
      render: (row: AuditLogRecord) => row.details || "—",
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (row: AuditLogRecord) => row.ipAddress || "—",
    },
  ];

  /**
   * No total is reported, so the count is what has actually been seen: the
   * pages already walked plus this one, and one extra while the trail runs on —
   * just enough for the pager to offer a next page.
   */
  const seenSoFar = (page - 1) * PAGE_SIZE + rows.length;
  const totalItems = hasMore ? seenSoFar + 1 : seenSoFar;

  return (
    <DataTable
      columns={columns}
      data={rows}
      page={page}
      pageSize={PAGE_SIZE}
      totalItems={totalItems}
      loading={loading}
      onPageChange={(next) => {
        if (next < 1 || next === page || loading) return;
        goToPage(next);
      }}
    />
  );
};

export default AuditLogs;
