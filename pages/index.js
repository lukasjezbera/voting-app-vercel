import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const CRITERIA = [
  { name: "Production Readiness", desc: "Jak blízko je appka k produkčnímu nasazení? Funguje spolehlivě, ošetřuje chyby, je připravena na reálná data?", weight: 3 },
  { name: "Byznys hodnota", desc: "Kolik času a práce appka reálně ušetří? Je to nice-to-have, nebo game changer?", weight: 2 },
  { name: "Kvalita řešení", desc: "Je appka použitelná a přehledná? Rozuměl by jí kolega bez vysvětlování?", weight: 1 },
  { name: "Rozvojový potenciál", desc: "Dá se na appce stavět dál? Jsou další use cases nebo vylepšení?", weight: 1 },
];
const LABELS = { 1: "Slabé", 2: "Podprůměrné", 3: "Průměrné", 4: "Dobré", 5: "Výborné" };
const MAX = CRITERIA.reduce((s, c) => s + 5 * c.weight, 0);
const ADMIN_PW = "alza2026";
const BAR_COLOR = "#4f46e5";

async function api(path, opts) {
  const res = await fetch(`/api/${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  return res.json();
}

function getResults(votes, projects) {
  const results = projects.map((p) => {
    const pv = votes.filter((v) => v.project === p.name);
    if (!pv.length) return { ...p, avg: 0, pct: 0, voters: 0, avgs: [0, 0, 0, 0] };
    const n = pv.length;
    const avgs = CRITERIA.map((_, i) => Math.round((pv.reduce((s, v) => s + v.scores[i], 0) / n) * 10) / 10);
    const avg = Math.round(avgs.reduce((s, a, i) => s + a * CRITERIA[i].weight, 0) * 10) / 10;
    return { ...p, avg, pct: Math.round((avg / MAX) * 100), voters: n, avgs };
  });
  return results.sort((a, b) => b.avg - a.avg);
}

export default function Home() {
  const [tab, setTab] = useState("vote");
  const [projects, setProjects] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vote state
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [scores, setScores] = useState([3, 3, 3, 3]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastProject, setLastProject] = useState("");
  const [lastScore, setLastScore] = useState(0);
  const [lastPct, setLastPct] = useState(0);

  // Results lock
  const [resultsPw, setResultsPw] = useState("");
  const [resultsOk, setResultsOk] = useState(false);
  const [resPwErr, setResPwErr] = useState(false);

  // Admin
  const [adminPw, setAdminPw] = useState("");
  const [adminOk, setAdminOk] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, v] = await Promise.all([api("projects"), api("votes")]);
    setProjects(Array.isArray(p) ? p : []);
    setVotes(Array.isArray(v) ? v : []);
    if (Array.isArray(p) && p.length && !project) setProject(p[0].name);
    setLoading(false);
  }, [project]);

  useEffect(() => { refresh(); }, []);

  const weighted = scores.reduce((s, v, i) => s + v * CRITERIA[i].weight, 0);
  const pct = Math.round((weighted / MAX) * 100);

  const handleVote = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await api("votes", { method: "POST", body: JSON.stringify({ voter: name.trim(), project, scores, weighted_score: weighted }) });
    setLastProject(project);
    setLastScore(weighted);
    setLastPct(pct);
    setSaving(false);
    setSubmitted(true);
    refresh();
  };

  const handleNewVote = () => {
    setSubmitted(false);
    setScores([3, 3, 3, 3]);
    const idx = projects.findIndex((p) => p.name === project);
    if (idx < projects.length - 1) setProject(projects[idx + 1].name);
  };

  const handleAddProject = async () => {
    if (!newName || !newOwner) return;
    await api("projects", { method: "POST", body: JSON.stringify({ name: newName, owner: newOwner, description: newDesc }) });
    setNewName(""); setNewOwner(""); setNewDesc("");
    refresh();
  };

  const handleDeleteProject = async (pname) => {
    if (!confirm(`Smazat projekt "${pname}" a všechna jeho hodnocení?`)) return;
    await api("projects", { method: "DELETE", body: JSON.stringify({ name: pname }) });
    refresh();
  };

  const handleClearVotes = async () => {
    if (!confirm("Opravdu smazat VŠECHNA hodnocení?")) return;
    await api("votes", { method: "DELETE" });
    refresh();
  };

  const results = getResults(votes, projects);
  const totalVoters = new Set(votes.map((v) => v.voter)).size;

  return (
    <>
      <Head>
        <title>Finance AI Hackathon — Hodnocení</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 60px", fontFamily: "'Inter', sans-serif", color: "#111827" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 0 16px", borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.025em" }}>Finance AI Hackathon</h1>
          <p style={{ fontSize: 15, color: "#6b7280", margin: "4px 0 0" }}>Hodnocení projektů</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>19. 2. – 20. 2. 2026</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 32, borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
          {[["vote", "Hlasování"], ["results", "Výsledky"], ["admin", "Admin"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: "none", border: "none", padding: "10px 0", cursor: "pointer",
              fontSize: 14, fontWeight: 500, fontFamily: "inherit",
              color: tab === k ? "#4f46e5" : "#6b7280",
              borderBottom: tab === k ? "2px solid #4f46e5" : "2px solid transparent",
              marginBottom: -1,
            }}>{l}</button>
          ))}
        </div>

        {loading && <p style={{ textAlign: "center", color: "#9ca3af" }}>Načítám...</p>}

        {/* ==================== VOTING ==================== */}
        {!loading && tab === "vote" && !submitted && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>Ohodnoť projekt</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              Vyber projekt, oznámkuj každé kritérium od 1 (nejhorší) do 5 (nejlepší) a odešli.
            </p>

            {projects.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Zatím nejsou přidané žádné projekty.</p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Tvoje jméno</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${!name.trim() ? "#fca5a5" : "#d1d5db"}`, background: !name.trim() ? "#fef2f2" : "#fff", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Vyber projekt</label>
                    <select value={project} onChange={(e) => setProject(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}>
                      {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ height: 1, background: "#e5e7eb", margin: "20px 0" }} />

                {CRITERIA.map((c, i) => (
                  <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{c.name}</span>
                      <span style={{
                        padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: c.weight === 3 ? "#fef3c7" : c.weight === 2 ? "#dbeafe" : "#f3f4f6",
                        color: c.weight === 3 ? "#92400e" : c.weight === 2 ? "#1e40af" : "#6b7280",
                      }}>váha x{c.weight}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.4 }}>{c.desc}</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((v) => {
                        const active = scores[i] === v;
                        return (
                          <button key={v} onClick={() => { const ns = [...scores]; ns[i] = v; setScores(ns); }}
                            style={{
                              flex: 1, padding: "8px 2px 6px", textAlign: "center", cursor: "pointer",
                              border: active ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                              borderRadius: 8, background: active ? "#eef2ff" : "#fff",
                              transition: "all 0.15s", fontFamily: "inherit",
                            }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: active ? "#4f46e5" : "#374151", lineHeight: 1 }}>{v}</div>
                            <div style={{ fontSize: 9, color: active ? "#6366f1" : "#9ca3af", marginTop: 2, lineHeight: 1.1 }}>{LABELS[v]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", border: "1px solid #c7d2fe", borderRadius: 12, padding: "16px 24px", margin: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#3730a3" }}>{weighted} / {MAX}</div>
                  <div style={{ fontSize: 14, color: "#6366f1", marginTop: 2 }}>{pct} % celkového skóre</div>
                </div>

                <button onClick={handleVote} disabled={!name.trim() || saving}
                  style={{
                    width: "100%", padding: "14px", border: "none", borderRadius: 10,
                    cursor: name.trim() ? "pointer" : "not-allowed",
                    background: name.trim() ? "#4f46e5" : "#9ca3af", color: "#fff",
                    fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                  }}>
                  {saving ? "Ukládám..." : "Odeslat hodnocení"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ==================== CONFIRMATION ==================== */}
        {!loading && tab === "vote" && submitted && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28, color: "#065f46" }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Hodnocení uloženo</h2>
            <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 8px" }}>Projekt: <strong>{lastProject}</strong></p>
            <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 4px" }}>Skóre: <strong>{lastScore} / {MAX}</strong> ({lastPct} %)</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 32px" }}>Můžeš hodnocení kdykoli změnit opětovným odesláním.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={handleNewVote} style={{ padding: "12px 24px", border: "none", borderRadius: 10, cursor: "pointer", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>Ohodnotit další projekt</button>
            </div>
          </div>
        )}

        {/* ==================== RESULTS LOCKED ==================== */}
        {!loading && tab === "results" && !resultsOk && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24, color: "#6b7280" }}>🔒</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Výsledky jsou zamčené</h3>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px" }}>Výsledky budou odhaleny po skončení hlasování.</p>
            <div style={{ maxWidth: 300, margin: "0 auto" }}>
              <input type="password" value={resultsPw} onChange={(e) => { setResultsPw(e.target.value); setResPwErr(false); }}
                placeholder="Heslo pro zobrazení výsledků"
                onKeyDown={(e) => { if (e.key === "Enter") { if (resultsPw === ADMIN_PW) { setResultsOk(true); refresh(); } else setResPwErr(true); } }}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${resPwErr ? "#ef4444" : "#d1d5db"}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", textAlign: "center" }} />
              {resPwErr && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>Špatné heslo</p>}
              <button onClick={() => { if (resultsPw === ADMIN_PW) { setResultsOk(true); refresh(); } else setResPwErr(true); }}
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, cursor: "pointer", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", marginTop: 12 }}>Zobrazit výsledky</button>
            </div>
          </div>
        )}

        {/* ==================== RESULTS UNLOCKED ==================== */}
        {!loading && tab === "results" && resultsOk && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              {[[totalVoters, "Hodnotitelů"], [votes.length, "Hodnocení celkem"], [projects.length, "Projektů"]].map(([v, l], i) => (
                <div key={i} style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>{v}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {results.filter((r) => r.voters > 0).length === 0 && (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>Zatím žádná hodnocení.</p>
            )}

            {results.map((r, rank) => {
              if (r.voters === 0) return null;
              const rc = rank < 3 ? ["linear-gradient(135deg, #fef3c7, #fde68a)", "linear-gradient(135deg, #f3f4f6, #e5e7eb)", "linear-gradient(135deg, #fed7aa, #fdba74)"][rank] : "#f9fafb";
              const tc = rank < 3 ? ["#92400e", "#4b5563", "#9a3412"][rank] : "#9ca3af";
              const pc = r.pct >= 70 ? ["#d1fae5", "#065f46"] : r.pct >= 40 ? ["#fef3c7", "#92400e"] : ["#fee2e2", "#991b1b"];
              return (
                <div key={r.name} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "20px 24px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: rc, color: tc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{rank + 1}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 17, color: "#111827" }}>{r.name}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>{r.owner}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{r.avg}</div>
                      <div style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: pc[0], color: pc[1] }}>{r.pct} %</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{r.voters} hodnocení</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                    {CRITERIA.map((c, ci) => (
                      <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#6b7280", minWidth: 150, flexShrink: 0 }}>{c.name} (x{c.weight})</span>
                        <div style={{ width: 100, flexShrink: 0, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(r.avgs[ci] / 5) * 100}%`, background: BAR_COLOR, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", minWidth: 28, textAlign: "right" }}>{r.avgs[ci]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button onClick={refresh} style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit", color: "#374151", marginTop: 8 }}>
              Obnovit výsledky
            </button>
          </div>
        )}

        {/* ==================== ADMIN ==================== */}
        {!loading && tab === "admin" && (
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px" }}>Správa projektů</h3>
            {!adminOk ? (
              <div style={{ maxWidth: 300 }}>
                <input type="password" value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && adminPw === ADMIN_PW) setAdminOk(true); }}
                  placeholder="Admin heslo"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={() => { if (adminPw === ADMIN_PW) setAdminOk(true); }}
                  style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, cursor: "pointer", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", marginTop: 12 }}>Přihlásit</button>
              </div>
            ) : (
              <>
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#065f46", marginBottom: 24 }}>Přihlášeno jako admin.</div>

                <p style={{ fontWeight: 600, marginBottom: 12 }}>Přidat projekt</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Název projektu"
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }} />
                  <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} placeholder="Autor / tým"
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }} />
                </div>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Krátký popis (volitelné)"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }} />
                <button onClick={handleAddProject} disabled={!newName || !newOwner}
                  style={{ padding: "10px 24px", border: "none", borderRadius: 8, cursor: "pointer", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", marginBottom: 24 }}>Přidat projekt</button>

                {projects.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "16px 0" }} />
                    <p style={{ fontWeight: 600, marginBottom: 12 }}>Aktuální projekty</p>
                    {projects.map((p) => (
                      <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <div>
                          <strong>{p.name}</strong> <span style={{ color: "#6b7280" }}>({p.owner})</span>
                          {p.description && <span style={{ color: "#9ca3af" }}> — {p.description}</span>}
                        </div>
                        <button onClick={() => handleDeleteProject(p.name)}
                          style={{ padding: "6px 12px", border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#dc2626", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Smazat</button>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ height: 1, background: "#e5e7eb", margin: "24px 0" }} />
                <p style={{ fontWeight: 600, marginBottom: 12, color: "#dc2626" }}>Nebezpečná zóna</p>
                <button onClick={handleClearVotes}
                  style={{ padding: "10px 24px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fff", color: "#dc2626", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Smazat všechna hodnocení
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
