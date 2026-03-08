const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID || "";
const API_KEY     = process.env.ROBLOX_API_KEY || "";
const SB_SECRET   = process.env.SOCIALBUZZ_SECRET || "";
const PORT        = process.env.PORT || 3000;

function getEffect(points) {
  const p = Number(points) || 0;
  if (p >= 10000) return "rainbow";
  if (p >= 5000)  return "gold";
  if (p >= 1000)  return "stars";
  return "socialbuzz";
}

async function notifyRoblox(data) {
  if (!UNIVERSE_ID || !API_KEY) {
    console.warn("[WARN] ROBLOX_UNIVERSE_ID atau ROBLOX_API_KEY kosong!");
    return;
  }
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/SocialBuzzDonation`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({ message: JSON.stringify(data) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Roblox ${res.status}: ${text}`);
  console.log("[OK] Roblox notified:", JSON.stringify(data));
}

// Health check — Railway ping endpoint ini
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", universe: UNIVERSE_ID });
});

// Endpoint donasi SocialBuzz
app.post("/donation", async (req, res) => {
  console.log("[BODY]", JSON.stringify(req.body));
  console.log("[HEADERS]", JSON.stringify(req.headers));

  // Validasi token
  const token = req.headers["sb-webhook-token"] || req.headers["x-webhook-token"] || req.headers["authorization"] || req.body.token || "";
  if (SB_SECRET && token !== SB_SECRET) {
    console.warn("[WARN] Token salah:", token);
    return res.status(403).json({ error: "Forbidden" });
  }

  const donorName    = req.body.donor_name    || req.body.buyer_name || req.body.username || req.body.name || "Anonim";
  const amountPoints = req.body.amount_points || req.body.points     || req.body.amount   || 0;
  const amountIDR    = req.body.amount_idr    || req.body.price      || req.body.idr      || 0;
  const message      = req.body.message       || req.body.note       || "";

  const payload = {
    donorName,
    amountPoints: Number(amountPoints) || 0,
    amountIDR:    Number(amountIDR) || 0,
    message:      String(message),
    effectType:   getEffect(amountPoints),
  };

  console.log("[DONATION]", JSON.stringify(payload));

  try {
    await notifyRoblox(payload);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[ERROR]", err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Universe ID: ${UNIVERSE_ID}`);
  console.log(`API Key: ${API_KEY ? "ada" : "KOSONG"}`);
  console.log(`SB Secret: ${SB_SECRET ? "ada" : "KOSONG"}`);
});
