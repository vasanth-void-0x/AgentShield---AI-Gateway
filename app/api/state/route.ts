import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { approvals, auditEvents } from "../../../db/schema";

type Verdict = "Allow" | "Review" | "Block";
type ApprovalStatus = "Pending" | "Approved" | "Denied";

function validVerdict(value: unknown): value is Verdict {
  return value === "Allow" || value === "Review" || value === "Block";
}

function validStatus(value: unknown): value is ApprovalStatus {
  return value === "Pending" || value === "Approved" || value === "Denied";
}

function safeScore(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

export async function GET() {
  try {
    const db = getDb();
    const [events, approvalRows] = await Promise.all([
      db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100),
      db.select().from(approvals).orderBy(desc(approvals.createdAt)).limit(100),
    ]);
    return Response.json({ events, approvals: approvalRows });
  } catch {
    return Response.json({ error: "Persistent storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = getDb();

    if (action === "log_event") {
      const event = payload.event as Record<string, unknown> | undefined;
      if (!event || !validVerdict(event.verdict)) return Response.json({ error: "Invalid audit event." }, { status: 400 });
      await db.insert(auditEvents).values({
        id: String(event.id).slice(0, 80),
        time: String(event.time).slice(0, 40),
        source: String(event.source).slice(0, 120),
        event: String(event.event).slice(0, 220),
        verdict: event.verdict,
        score: safeScore(event.score),
      }).onConflictDoNothing();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (action === "create_approval") {
      const approval = payload.approval as Record<string, unknown> | undefined;
      if (!approval || !validStatus(approval.status)) return Response.json({ error: "Invalid approval request." }, { status: 400 });
      await db.insert(approvals).values({
        id: String(approval.id).slice(0, 80),
        time: String(approval.time).slice(0, 40),
        action: String(approval.action).slice(0, 140),
        reason: String(approval.reason).slice(0, 300),
        risk: safeScore(approval.risk),
        status: approval.status,
      }).onConflictDoNothing();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (action === "decide_approval") {
      const id = String(payload.id ?? "").slice(0, 80);
      const status = payload.status;
      if (!id || !validStatus(status) || status === "Pending") return Response.json({ error: "Invalid approval decision." }, { status: 400 });
      await db.update(approvals).set({ status }).where(eq(approvals.id, id));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported state action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Persistent storage is unavailable." }, { status: 503 });
  }
}

