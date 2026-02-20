import { loadProjects, saveProject, deleteProject } from "../../lib/sheets";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const projects = await loadProjects();
      return res.status(200).json(projects);
    }
    if (req.method === "POST") {
      const { name, owner, description } = req.body;
      if (!name || !owner) return res.status(400).json({ error: "name and owner required" });
      await saveProject(name, owner, description || "");
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "name required" });
      await deleteProject(name);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
