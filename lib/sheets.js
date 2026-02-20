import { google } from "googleapis";

function getAuth() {
  const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth;
}

async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId() {
  return process.env.SPREADSHEET_ID;
}

export async function loadProjects() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: "projects!A:D",
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => ({
    name: row[0] || "",
    owner: row[1] || "",
    description: row[2] || "",
    created_at: row[3] || "",
  }));
}

export async function saveProject(name, owner, description) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: "projects!A:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [[name, owner, description, new Date().toISOString()]],
    },
  });
}

export async function deleteProject(projectName) {
  const sheets = await getSheets();
  const sid = getSpreadsheetId();

  // Delete from projects sheet
  const projRes = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: "projects!A:D" });
  const projRows = projRes.data.values || [];
  const projSheetId = await getSheetGid(sheets, sid, "projects");
  for (let i = projRows.length - 1; i >= 1; i--) {
    if (projRows[i][0] === projectName) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sid,
        requestBody: { requests: [{ deleteDimension: { range: { sheetId: projSheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] },
      });
    }
  }

  // Delete votes for this project
  const voteRes = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: "votes!A:H" });
  const voteRows = voteRes.data.values || [];
  const voteSheetId = await getSheetGid(sheets, sid, "votes");
  for (let i = voteRows.length - 1; i >= 1; i--) {
    if (voteRows[i][1] === projectName) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sid,
        requestBody: { requests: [{ deleteDimension: { range: { sheetId: voteSheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] },
      });
    }
  }
}

export async function loadVotes() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: "votes!A:H",
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => ({
    voter: row[0] || "",
    project: row[1] || "",
    scores: [parseInt(row[2]) || 0, parseInt(row[3]) || 0, parseInt(row[4]) || 0, parseInt(row[5]) || 0],
    weighted_score: parseInt(row[6]) || 0,
    timestamp: row[7] || "",
  }));
}

export async function saveVote(voter, project, scores, weightedScore) {
  const sheets = await getSheets();
  const sid = getSpreadsheetId();

  // Delete existing vote from same voter for same project
  const voteRes = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: "votes!A:H" });
  const voteRows = voteRes.data.values || [];
  const voteSheetId = await getSheetGid(sheets, sid, "votes");
  for (let i = voteRows.length - 1; i >= 1; i--) {
    if (voteRows[i][0] === voter && voteRows[i][1] === project) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sid,
        requestBody: { requests: [{ deleteDimension: { range: { sheetId: voteSheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] },
      });
    }
  }

  // Append new vote
  await sheets.spreadsheets.values.append({
    spreadsheetId: sid,
    range: "votes!A:H",
    valueInputOption: "RAW",
    requestBody: {
      values: [[voter, project, ...scores, weightedScore, new Date().toISOString()]],
    },
  });
}

export async function clearAllVotes() {
  const sheets = await getSheets();
  const sid = getSpreadsheetId();
  const voteSheetId = await getSheetGid(sheets, sid, "votes");

  // Clear and re-add header
  await sheets.spreadsheets.values.clear({ spreadsheetId: sid, range: "votes!A:H" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: "votes!A1:H1",
    valueInputOption: "RAW",
    requestBody: { values: [["voter", "project", "score_1", "score_2", "score_3", "score_4", "weighted_score", "timestamp"]] },
  });
}

async function getSheetGid(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find((s) => s.properties.title === title);
  return sheet ? sheet.properties.sheetId : 0;
}
