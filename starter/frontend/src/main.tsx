import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApiError } from "@uncrud/client";
import { UncrudProvider, useAuth, useCommand, useProjection } from "@uncrud/react";
import { authSource, client, projections, signIn } from "./firebase";
import "./style.css";

interface Meta { sourceVersion: number; schemaVersion: number; updatedAt: number }
interface PollView { id: string; title: string; options: { id: string; label: string }[]; counts: Record<string, number>; meta: Meta }
interface VoteView { optionId: string; meta: Meta }
interface VoteInput { optionId: string; expectedVoteVersion: number }

function decodePoll(value: Record<string, unknown>): PollView {
  const view = value as unknown as PollView;
  if (typeof view.title !== "string" || !Array.isArray(view.options) || !view.counts || view.meta?.schemaVersion !== 1)
    throw new Error("Unsupported poll projection");
  return view;
}

function Poll() {
  const identity = useAuth();
  const [authError, setAuthError] = useState("");
  useEffect(() => { void signIn().catch(() => setAuthError("Cannot connect to Auth Emulator. Check npm run dev.")); }, []);
  const pollRef = useMemo(() => projections.document("pollViews/weekend", decodePoll, "poll-v1"), []);
  const voteRef = useMemo(() => projections.document<VoteView>(`userPollViews/${identity.uid ?? "pending"}/polls/weekend`,
    value => {
      const view = value as unknown as VoteView;
      if (typeof view.optionId !== "string" || view.meta?.schemaVersion !== 1) throw new Error("Unsupported vote projection");
      return view;
    }, "vote-v1"), [identity.uid]);
  const poll = useProjection(pollRef);
  const personal = useProjection(voteRef);
  const command = useCommand<VoteInput>("/polls/weekend/vote");
  const attempt = useRef<{ commandId: string; body: VoteInput } | null>(null);
  const [retry, setRetry] = useState(false);
  const confirmed = command.receipt
    ? (personal.data?.meta.sourceVersion ?? 0) >= (command.receipt.versions.vote ?? Infinity) : true;
  const ready = identity.status === "signed-in" && poll.status === "ready"
    && ["ready", "missing"].includes(personal.status) && !personal.fromCache && !poll.fromCache;
  async function vote(optionId?: string) {
    if (optionId) attempt.current = { commandId: crypto.randomUUID(),
      body: { optionId, expectedVoteVersion: personal.data?.meta.sourceVersion ?? 0 } };
    if (!attempt.current) return;
    setRetry(false);
    try { await command.execute(attempt.current.body, { commandId: attempt.current.commandId }); }
    catch (error) { setRetry(error instanceof ApiError && error.outcome === "unknown"); }
  }
  const total = Object.values(poll.data?.counts ?? {}).reduce((sum, count) => sum + count, 0);
  return <>
    <header><a className="wordmark" href="/" aria-label="UnCRUD home">un<span>crud</span><i>↗</i></a>
      <span className="badge"><span className="dot" /> {import.meta.env.DEV ? "LOCAL EMULATORS" : "CONNECTED"}</span></header>
    <main>
      <section className="intro"><p className="eyebrow">COMMANDS IN. PROJECTIONS OUT.</p>
        <h1>One vote.<br /><span>Every screen, live.</span></h1>
        <p className="lead">The server owns the write. Firestore carries the update.<br />Open a second window and watch the same state arrive.</p>
      </section>
      <section className="workspace" aria-label="Realtime poll">
        <div className="poll-card"><div className="card-top"><span className="eyebrow">THE SHARED READ MODEL</span>
          <span className="revision" data-testid="revision">v{poll.data?.meta.sourceVersion ?? "—"}</span></div>
          <h2>{poll.data?.title ?? "Connecting to the poll…"}</h2>
          {(authError || identity.error?.message) && <p role="alert">{authError || identity.error?.message}</p>}
          {poll.error && <p role="alert">Cannot read the poll: {poll.error.message}</p>}
          {personal.error && <p role="alert">Cannot read your vote: {personal.error.message}</p>}
          {poll.status === "missing" && <p>No poll yet. Restart the local backend to create its fixture.</p>}
          <div className="options">{poll.data?.options.map((option, index) => {
            const count = poll.data?.counts[option.id] ?? 0;
            const selected = personal.data?.optionId === option.id;
            return <button key={option.id} className={`option ${selected ? "selected" : ""}`} aria-pressed={selected}
              disabled={!ready || command.pending || !confirmed || retry} onClick={() => void vote(option.id)}>
              <span className="fill" style={{ width: `${total ? count / total * 100 : 0}%` }} />
              <span className="option-content"><span className="option-number">0{index + 1}</span>
                <span>{option.label}{selected && <small>Your vote</small>}</span>
                <strong data-testid={`count-${option.id}`}>{count}</strong></span>
            </button>;
          })}</div>
          <div className="poll-footer"><span><strong data-testid="total">{total}</strong> votes · one per Firebase identity</span>
            <span aria-live="polite">{command.pending ? "Sending command…" : !confirmed ? "Waiting for projection…"
              : poll.fromCache || personal.fromCache ? "Cached · waiting for server" : ready ? "Live snapshot" : "Connecting…"}</span></div>
          {command.error && <p role="alert">{command.error.message}</p>}
          {retry && <button className="retry" onClick={() => void vote()}>Retry the same command</button>}
        </div>
        <aside className="flow-card"><p className="eyebrow">FOLLOW THE DATA</p><h2>A small command.<br />A complete round trip.</h2>
          <ol><li><b>01</b><div><strong>React sends an intention</strong><p>Firebase ID token + idempotency key</p></div></li>
            <li><b>02</b><div><strong>Java verifies & commits</strong><p>Private vote + views in one transaction</p></div></li>
            <li><b>03</b><div><strong>Firestore streams the view</strong><p>One listener. No API polling.</p></div></li>
            <li><b>04</b><div><strong>Every client sees the result</strong><p>The snapshot updates this screen</p></div></li></ol>
          <div className="boundary">PRIVATE STATE <span>→</span> SAFE PROJECTION</div>
        </aside>
      </section>
      <section className="notes"><p><strong>Try it together.</strong> Open a private window for a second identity. Change either vote; both totals update.</p>
        <p><strong>Inspect the boundary.</strong> Your browser can read permitted views. Commands and authorization belong to the backend.</p></section>
    </main><footer>UnCRUD / poll starter <span>HTTP commands + Firestore realtime</span></footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<StrictMode>
  <UncrudProvider auth={authSource} client={client}><Poll /></UncrudProvider>
</StrictMode>);
