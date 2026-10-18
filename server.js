const express = require("express");
const rateLimit = require("express-rate-limit");
const { GoogleGenAI, Type } = require("@google/genai");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
app.use(express.static("public"));

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again in an hour." },
});

async function extractExpenses(chatText) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt =
    "Read this group trip chat. Return every shared expense as JSON. " +
    "For each one give: payer (first name), amount (number, no currency symbol), " +
    "and split_between (list of first names who share the cost). " +
    "Ignore messages that are not expenses.\n\n" + chatText;
  const response = await ai.models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            payer: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            split_between: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["payer", "amount", "split_between"],
        },
      },
    },
  });
  return JSON.parse(response.text);
}

function settle(expenses) {
  const bal = {};
  for (const e of expenses) {
    if (!e.split_between.length) continue;
    const share = e.amount / e.split_between.length;
    bal[e.payer] = (bal[e.payer] || 0) + e.amount;
    for (const p of e.split_between) bal[p] = (bal[p] || 0) - share;
  }
  const creditors = [];
  const debtors = [];
  for (const [n, v] of Object.entries(bal)) {
    const r = Math.round(v * 100) / 100;
    if (r > 0) creditors.push({ n, v: r });
    else if (r < 0) debtors.push({ n, v: -r });
  }
  const pay = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.v - a.v);
    debtors.sort((a, b) => b.v - a.v);
    const c = creditors[0];
    const d = debtors[0];
    const amt = Math.min(c.v, d.v);
    pay.push({ from: d.n, to: c.n, amount: Math.round(amt * 100) / 100 });
    c.v = Math.round((c.v - amt) * 100) / 100;
    d.v = Math.round((d.v - amt) * 100) / 100;
    if (c.v === 0) creditors.shift();
    if (d.v === 0) debtors.shift();
  }
  return pay;
}

app.post("/api/settle", limiter, async (req, res) => {
  try {
    const chat = (req.body && req.body.chat) || "";
    if (typeof chat !== "string" || chat.trim().length < 10) {
      return res.status(400).json({ error: "Please paste a group chat first." });
    }
    if (chat.length > 50000) {
      return res.status(400).json({ error: "Chat is too long (max 50,000 characters)." });
    }
    const expenses = await extractExpenses(chat);
    res.json({ expenses, payments: settle(expenses) });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Something went wrong reading the chat. Try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Gather running on port " + PORT));
