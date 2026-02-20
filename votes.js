import { loadVotes, saveVote, clearAllVotes } from "../../lib/sheets";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const votes = await loadVotes();
      return res.status(200).json(votes);
    }
    if (req.method === "POST") {
      const { voter, project, scores, weighted_score } = req.body;
      if (!voter || !project || !scores) return res.status(400).json({ error: "voter, project, scores required" });
      await saveVote(voter, project, scores, weighted_score);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      await clearAllVotes();
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
