const admin = require("firebase-admin");

const dailyMemoryUsage = new Map();

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function initFirebase() {
  if (admin.apps.length) return admin.app();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Firebase Admin nao esta configurado nas variaveis do Netlify.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });
}

function dayKey(uid) {
  return `${uid}:${new Date().toISOString().slice(0, 10)}`;
}

async function checkDailyLimit(uid) {
  const limit = Number(process.env.DAILY_RENDER_LIMIT || 5);
  const key = dayKey(uid);

  try {
    const db = admin.firestore();
    const ref = db.collection("renderUsage").doc(key);
    const allowed = await db.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      const count = snap.exists ? Number(snap.data().count || 0) : 0;
      if (count >= limit) return false;
      transaction.set(ref, {
        uid,
        date: key.split(":")[1],
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    });
    return allowed;
  } catch (error) {
    const count = dailyMemoryUsage.get(key) || 0;
    if (count >= limit) return false;
    dailyMemoryUsage.set(key, count + 1);
    return true;
  }
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return {
    mime: match[1],
    bytes
  };
}

function buildPrompt(input) {
  const target = input.mode === "edit"
    ? "Edit the uploaded architectural image while preserving its geometry and camera angle."
    : "Transform the uploaded architectural sketch, CAD view, or photo into a photorealistic architectural render while preserving layout, massing, camera angle, openings, and proportions.";

  return [
    target,
    `Style: ${input.style || "modern"}.`,
    `Scene: ${input.scene || "exterior"}.`,
    `Camera angle: ${input.angle || "eye level"}.`,
    `Lighting: ${input.light || "natural architectural lighting"}.`,
    input.material ? `Localized material instruction: ${input.material}.` : "",
    input.prompt ? `User instruction: ${input.prompt}.` : "",
    "Use realistic materials, believable shadows, architectural photography composition, no text, no watermark, no distorted structure."
  ].filter(Boolean).join(" ");
}

async function callOpenAI(input) {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const prompt = buildPrompt(input);
  const image = dataUrlToBlob(input.imageDataUrl);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao esta configurada no Netlify.");
  }

  if (image) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", input.size || "1536x1024");
    form.append("quality", input.quality || "medium");
    form.append("image", new Blob([image.bytes], { type: image.mime }), "input.png");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error?.message || "Falha ao gerar edicao de imagem.");
    }

    const b64 = body.data?.[0]?.b64_json || body.b64_json;
    if (!b64) throw new Error("A API nao devolveu imagem.");
    return { imageUrl: `data:image/png;base64,${b64}`, usage: body.usage || null };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size: input.size || "1536x1024",
      quality: input.quality || "medium"
    })
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || "Falha ao gerar imagem.");
  }

  const b64 = body.data?.[0]?.b64_json || body.b64_json;
  if (!b64) throw new Error("A API nao devolveu imagem.");
  return { imageUrl: `data:image/png;base64,${b64}`, usage: body.usage || null };
}

exports.handler = async event => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo nao permitido." });
  }

  try {
    initFirebase();
    const input = JSON.parse(event.body || "{}");
    const token = input.idToken;
    if (!token) return json(401, { error: "Faz login com Google para gerar renders." });

    const decoded = await admin.auth().verifyIdToken(token);
    const allowed = await checkDailyLimit(decoded.uid);
    if (!allowed) return json(429, { error: "Limite diario de renders atingido." });

    const result = await callOpenAI(input);
    return json(200, {
      ...result,
      uid: decoded.uid,
      email: decoded.email || null
    });
  } catch (error) {
    return json(500, { error: error.message || "Erro inesperado ao gerar render." });
  }
};
