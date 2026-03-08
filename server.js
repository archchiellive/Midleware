// ============================================================
// SocialBuzz → Roblox Donation Middleware
// Deploy ke: Railway / Render / Glitch (gratis)
// ============================================================

const express = require("express");
const app = express();
app.use(express.json());

// === KONFIGURASI — isi sesuai milikmu ===
const CONFIG = {
  ROBLOX_UNIVERSE_ID: "UNIVERSE_ID_KAMU",   // Ganti dengan Universe ID game kamu
  ROBLOX_API_KEY:     "ROBLOX_API_KEY_KAMU", // Dari Open Cloud di creator.roblox.com
  SOCIALBUZZ_SECRET:  "SECRET_KAMU",         // Buat sendiri, samakan dengan di SocialBuzz webhook
  PORT: process.env.PORT || 3000,
};

// Kirim pesan ke Roblox via MessagingService (Open Cloud)
async function notifyRoblox(donorName, amountPoints, amountIDR, message) {
  const payload = {
    donorName,
    amountPoints,
    amountIDR,
    message: message || "",
    effectType: getEffectByAmount(amountPoints),
  };

  const response = await fetch(
    `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.ROBLOX_UNIVERSE_ID}/topics/SocialBuzzDonation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.ROBLOX_API_KEY,
      },
      body: JSON.stringify({ message: JSON.stringify(payload) }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Roblox API error: ${response.status} — ${err}`);
  }

  return payload;
}

// Tentukan tipe efek berdasarkan jumlah poin
function getEffectByAmount(points) {
  if (points >= 10000) return "rainbow";
  if (points >= 5000)  return "gold";
  if (points >= 1000)  return "stars";
  return "socialbuzz";
}

// ============================================================
// ENDPOINT — SocialBuzz mengirim webhook ke sini
// URL: https://domain-kamu.com/donation
// ============================================================
app.post("/donation", async (req, res) => {
  // Log semua yang masuk untuk debug
  console.log("=== HEADERS ===", JSON.stringify(req.headers));
  console.log("=== BODY ===", JSON.stringify(req.body));

  // SEMENTARA: skip validasi token dulu
  // const secret = req.headers["x-webhook-token"] || req.body.token;
  // if (secret !== CONFIG.SOCIALBUZZ_SECRET) {
  //   return res.status(403).json({ error: "Forbidden" });
  // }

  const { donor_name, amount_points, amount_idr, message } = req.body;

  console.log(`[DONATION] ${donor_name} — ${amount_points} poin`);

  res.json({ success: true, received: req.body });
});

  // Struktur webhook SocialBuzz (sesuaikan jika berbeda)
  const { donor_name, amount_points, amount_idr, message } = req.body;

  if (!donor_name || amount_points === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log(`[DONATION] ${donor_name} — ${amount_points} poin (Rp${amount_idr})`);

  try {
    const payload = await notifyRoblox(donor_name, amount_points, amount_idr || 0, message);
    console.log("[OK] Notified Roblox:", payload);
    res.json({ success: true, payload });
  } catch (err) {
    console.error("[ERROR]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/", (req, res) => res.json({ status: "SocialBuzz Middleware running ✅" }));

app.listen(CONFIG.PORT, () => {
  console.log(`Server berjalan di port ${CONFIG.PORT}`);
});
