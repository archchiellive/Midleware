const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === KONFIGURASI ===
const CONFIG = {
  ROBLOX_UNIVERSE_ID: process.env.ROBLOX_UNIVERSE_ID || "",
  ROBLOX_API_KEY:     process.env.ROBLOX_API_KEY || "",
  SOCIALBUZZ_SECRET:  process.env.SOCIALBUZZ_SECRET || "",
  PORT:               process.env.PORT || 3000,
};

// Tentukan tipe efek berdasarkan jumlah poin
function getEffectByAmount(points) {
  const p = Number(points) || 0;
  if (p >= 10000) return "rainbow";
  if (p >= 5000)  return "gold";
  if (p >= 1000)  return "stars";
  return "socialbuzz";
}

// Kirim notifikasi ke Roblox via Open Cloud MessagingService
async function notifyRoblox(donorName, amountPoints, amountIDR, message, effectType) {
  if (!CONFIG.ROBLOX_UNIVERSE_ID || !CONFIG.ROBLOX_API_KEY) {
    console.warn("[WARN] ROBLOX_UNIVERSE_ID atau ROBLOX_API_KEY belum diisi di Variables!");
    return;
  }

  const payload = {
    donorName:    String(donorName || "Anonim"),
    amountPoints: Number(amountPoints) || 0,
    amountIDR:    Number(amountIDR) || 0,
    message:      String(message || ""),
    effectType:   String(effectType || "socialbuzz"),
  };

  const url = `https://apis.roblox.com/messaging-service/v1/universes/${CONFIG.ROBLOX_UNIVERSE_ID}/topics/SocialBuzzDonation`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.ROBLOX_API_KEY,
    },
    body: JSON.stringify({ message: JSON.stringify(payload) }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Roblox API ${response.status}: ${responseText}`);
  }

  console.log("[OK] Roblox notified:", JSON.stringify(payload));
  return payload;
}

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "SocialBuzz Middleware running ✅",
    universe: CONFIG.ROBLOX_UNIVERSE_ID || "BELUM DIISI",
    hasApiKey: !!CONFIG.ROBLOX_API_KEY,
    hasSecret: !!CONFIG.SOCIALBUZZ_SECRET,
  });
});

// Endpoint utama — SocialBuzz kirim webhook ke sini
app.post("/donation", async (req, res) => {
  console.log("[REQUEST] Headers:", JSON.stringify(req.headers));
  console.log("[REQUEST] Body:", JSON.stringify(req.body));

  // Cek token dari berbagai kemungkinan field
  const incomingToken =
    req.headers["x-webhook-token"] ||
    req.headers["authorization"] ||
    req.headers["x-socialbuzz-secret"] ||
    req.body.token ||
    req.body.webhook_token ||
    "";

  if (CONFIG.SOCIALBUZZ_SECRET && incomingToken !== CONFIG.SOCIALBUZZ_SECRET) {
    console.warn("[WARN] Token tidak cocok. Incoming:", incomingToken);
    return res.status(403).json({ error: "Forbidden: token tidak cocok" });
  }

  // Ambil data — support berbagai kemungkinan nama field SocialBuzz
  const donorName    = req.body.donor_name    || req.body.buyer_name || req.body.username || req.body.name || "Anonim";
  const amountPoints = req.body.amount_points || req.body.points     || req.body.amount   || 0;
  const amountIDR    = req.body.amount_idr    || req.body.price      || req.body.idr      || 0;
  const message      = req.body.message       || req.body.note       || req.body.msg      || "";
  const effectType   = getEffectByAmount(amountPoints);

  console.log(`[DONATION] ${donorName} | ${amountPoints} poin | Rp${amountIDR} | Efek: ${effectType}`);

  try {
    await notifyRoblox(donorName, amountPoints, amountIDR, message, effectType);
    return res.json({ success: true, donor: donorName, points: amountPoints, idr: amountIDR });
  } catch (err) {
    console.error("[ERROR] Gagal notify Roblox:", err.message);
    return res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server berjalan di port ${CONFIG.PORT}`);
  console.log(`   Universe ID : ${CONFIG.ROBLOX_UNIVERSE_ID || "BELUM DIISI"}`);
  console.log(`   API Key     : ${CONFIG.ROBLOX_API_KEY ? "✓ ada" : "BELUM DIISI"}`);
  console.log(`   SB Secret   : ${CONFIG.SOCIALBUZZ_SECRET ? "✓ ada" : "BELUM DIISI"}`);
});
