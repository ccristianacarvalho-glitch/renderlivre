const canvas = document.querySelector("#preview");
const ctx = canvas.getContext("2d");
const upload = document.querySelector("#upload");
const uploadInfo = document.querySelector("#uploadInfo");
const mode = document.querySelector("#mode");
const style = document.querySelector("#style");
const scaleButtons = document.querySelectorAll("[data-scale]");
const lightButtons = document.querySelectorAll("[data-light]");
const promptInput = document.querySelector("#prompt");
const angle = document.querySelector("#angle");
const scene = document.querySelector("#scene");
const material = document.querySelector("#material");
const statusText = document.querySelector("#status");
const meta = document.querySelector("#meta");
const spinner = document.querySelector("#spinner");
const generate = document.querySelector("#generate");
const download = document.querySelector("#download");
const drawRegion = document.querySelector("#drawRegion");
const addMarkup = document.querySelector("#addMarkup");
const clearMarks = document.querySelector("#clearMarks");

const state = {
  image: null,
  scale: 2,
  light: "Sunrise",
  drawing: false,
  markups: [],
  regions: [],
  activeTool: "none",
  tick: 0,
  generated: false,
  fileName: "",
  imageDataUrl: "",
  aiResult: null
};

const palettes = {
  Moderno: ["#e8e5dd", "#2f3d3b", "#9aa899", "#c4b49c"],
  Contemporaneo: ["#f1efe7", "#4d5d58", "#b9c8bd", "#a78d72"],
  Nordico: ["#f6f5ee", "#83938f", "#d9d1bd", "#ffffff"],
  Japandi: ["#e9dfcf", "#3a342d", "#b7aa94", "#d8c8af"],
  Brutalista: ["#c7c7bf", "#454743", "#8a8b83", "#dedbd0"],
  Mediterranico: ["#f1e1c4", "#315e73", "#c98257", "#ffffff"],
  "New Urbanism": ["#dec7a1", "#5f7467", "#8a453c", "#f3eadb"],
  "Luxo minimalista": ["#ebe7dd", "#222421", "#bda76b", "#f8f6ef"]
};

function activePalette() {
  return palettes[style.value] || palettes.Moderno;
}

function setStatus(text) {
  statusText.textContent = text;
  meta.textContent = `${mode.options[mode.selectedIndex].text} | ${style.value} | ${state.scale}x`;
}

function setUploadInfo(text, kind = "") {
  uploadInfo.textContent = text;
  uploadInfo.className = kind;
}

function clearCanvasBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const night = state.light === "Night";
  grad.addColorStop(0, night ? "#1f2931" : state.light === "Noon" ? "#dbeaf0" : "#f2d8b4");
  grad.addColorStop(.58, night ? "#30343a" : "#f4efe5");
  grad.addColorStop(1, "#d9d4c8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawUploadedImage() {
  if (state.aiResult) {
    const ratio = Math.min(canvas.width / state.aiResult.width, canvas.height / state.aiResult.height);
    const w = state.aiResult.width * ratio;
    const h = state.aiResult.height * ratio;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.fillStyle = "#f8f6ef";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.aiResult, x, y, w, h);
    return true;
  }

  if (!state.image) return false;
  if (!state.image.naturalWidth || !state.image.naturalHeight) return false;
  const ratio = Math.min(canvas.width / state.image.width, canvas.height / state.image.height);
  const w = state.image.width * ratio;
  const h = state.image.height * ratio;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.fillStyle = "#f8f6ef";
  ctx.fillRect(x - 18, y - 18, w + 36, h + 36);
  ctx.globalAlpha = state.generated && mode.value === "render" ? .34 : .92;
  ctx.drawImage(state.image, x, y, w, h);
  ctx.globalAlpha = 1;
  return true;
}

function drawRenderTreatment() {
  if (!state.generated || state.aiResult) return;
  const p = activePalette();
  const beam = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  beam.addColorStop(0, "rgba(255,255,255,.1)");
  beam.addColorStop(.45, "rgba(255,255,255,.34)");
  beam.addColorStop(1, "rgba(24,32,28,.08)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.fillRect(canvas.width * .08, canvas.height * .78, canvas.width * .84, 46);
  ctx.fillStyle = p[2];
  ctx.fillRect(canvas.width * .1, canvas.height * .795, canvas.width * .22, 16);
  ctx.fillStyle = p[3];
  ctx.fillRect(canvas.width * .36, canvas.height * .795, canvas.width * .19, 16);
  ctx.fillStyle = p[1];
  ctx.fillRect(canvas.width * .59, canvas.height * .795, canvas.width * .28, 16);

  ctx.strokeStyle = "rgba(255,255,255,.72)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = canvas.width * (.16 + i * .09);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * .22);
    ctx.lineTo(x + 35, canvas.height * .66);
    ctx.stroke();
  }
}

function drawBuilding() {
  const p = activePalette();
  const exterior = scene.value !== "Interior";
  const baseY = canvas.height * .78;
  const left = canvas.width * .18;
  const width = canvas.width * .64;
  const height = canvas.height * .44;

  ctx.fillStyle = "rgba(30, 42, 37, .14)";
  ctx.beginPath();
  ctx.ellipse(canvas.width * .5, baseY + 34, width * .62, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  if (exterior) {
    ctx.fillStyle = p[0];
    ctx.fillRect(left, baseY - height, width, height);
    ctx.fillStyle = p[1];
    ctx.fillRect(left + width * .56, baseY - height * .9, width * .24, height * .9);
    ctx.fillStyle = p[2];
    ctx.fillRect(left + width * .08, baseY - height * .72, width * .36, height * .48);
    ctx.fillStyle = "rgba(255,255,255,.62)";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(left + width * (.12 + i * .075), baseY - height * .68, width * .045, height * .38);
    }
    ctx.fillStyle = p[3];
    ctx.fillRect(left + width * .1, baseY - height * .07, width * .78, height * .07);
    ctx.fillStyle = "#2f322f";
    ctx.fillRect(left + width * .58, baseY - height * .28, width * .13, height * .28);
  } else {
    ctx.fillStyle = p[0];
    ctx.fillRect(left, baseY - height, width, height);
    ctx.fillStyle = p[2];
    ctx.fillRect(left + width * .06, baseY - height * .72, width * .88, height * .08);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(left + width * .08, baseY - height * .62, width * .34, height * .5);
    ctx.fillStyle = p[1];
    ctx.fillRect(left + width * .5, baseY - height * .52, width * .3, height * .28);
    ctx.fillStyle = p[3];
    ctx.fillRect(left + width * .2, baseY - height * .16, width * .58, height * .08);
  }
}

function drawEnhancements() {
  if (mode.value === "enhance") {
    ctx.filter = "contrast(1.08) saturate(1.16)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }

  if (mode.value === "staging") {
    ctx.fillStyle = "#d7c09a";
    ctx.fillRect(500, 650, 280, 58);
    ctx.fillStyle = "#394840";
    ctx.fillRect(535, 590, 210, 70);
    ctx.fillStyle = "#efede5";
    ctx.fillRect(565, 600, 62, 44);
    ctx.fillRect(650, 600, 62, 44);
  }

  if (mode.value === "photo") {
    ctx.fillStyle = "rgba(214, 242, 95, .24)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (mode.value === "video") {
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(220, 760);
    ctx.bezierCurveTo(430, 540, 790, 510, 1040, 320);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMarks() {
  state.regions.forEach((region, index) => {
    ctx.fillStyle = "rgba(31, 122, 85, .16)";
    ctx.strokeStyle = "#1f7a55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.w, region.h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f7a55";
    ctx.fillText(`Regiao ${index + 1}`, region.x + 10, region.y + 24);
  });

  state.markups.forEach((point, index) => {
    ctx.fillStyle = "#d6f25f";
    ctx.strokeStyle = "#18201c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#18201c";
    ctx.font = "800 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), point.x, point.y + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });
}

function drawLabels() {
  const caption = promptInput.value.trim() || material.value.trim() || "render arquitetonico gratuito";
  ctx.fillStyle = "rgba(255,255,255,.84)";
  ctx.fillRect(34, 34, 520, 82);
  ctx.fillStyle = "#18201c";
  ctx.font = "800 26px Inter, sans-serif";
  ctx.fillText(`${style.value} | ${state.light}`, 58, 72);
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText(caption.slice(0, 56), 58, 101);
}

function renderPreview() {
  clearCanvasBackground();
  const hadUpload = drawUploadedImage();
  if (!hadUpload || mode.value === "render" || mode.value === "staging") {
    drawBuilding();
  }
  drawEnhancements();
  drawRenderTreatment();
  drawMarks();
  drawLabels();
}

function generateRender() {
  spinner.classList.remove("hidden");
  setStatus("A preparar pedido de render AI...");

  generate.disabled = true;
  generate.textContent = "A gerar...";

  window.setTimeout(async () => {
    state.tick += 1;
    try {
      const token = await window.RenderAuth?.getIdToken?.();
      if (!token) {
        state.generated = true;
        renderPreview();
        setStatus("Entra com Google para gerar renders AI reais.");
        return;
      }

      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          imageDataUrl: state.imageDataUrl,
          prompt: promptInput.value.trim(),
          material: material.value.trim(),
          mode: mode.value,
          style: style.value,
          angle: angle.value,
          scene: scene.value,
          light: state.light,
          scale: state.scale,
          size: "1536x1024",
          quality: "medium"
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Nao foi possivel gerar o render.");
      }

      await loadAiResult(body.imageUrl);
      state.generated = true;
      renderPreview();
      setStatus("Render AI gerado. Podes descarregar o PNG.");
    } catch (error) {
      state.generated = true;
      renderPreview();
      setStatus(error.message || "Falha ao gerar render AI.");
    } finally {
      spinner.classList.add("hidden");
      generate.disabled = false;
      generate.textContent = "Gerar render AI";
    }
  }, 650);
}

function imageToDataUrl(image, maxSide = 1400) {
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const out = document.createElement("canvas");
  out.width = Math.round(image.naturalWidth * ratio);
  out.height = Math.round(image.naturalHeight * ratio);
  const outCtx = out.getContext("2d");
  outCtx.drawImage(image, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

function loadAiResult(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      state.aiResult = image;
      resolve();
    };
    image.onerror = () => reject(new Error("A imagem gerada nao carregou."));
    image.src = src;
  });
}

upload.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  state.generated = false;
  state.aiResult = null;
  state.fileName = file.name;
  setUploadInfo(`A carregar: ${file.name}`, "ready");
  setStatus("A carregar imagem...");
  if (file.type === "application/pdf") {
    state.image = null;
    state.imageDataUrl = "";
    state.generated = true;
    setUploadInfo(`PDF recebido: ${file.name}`, "ready");
    setStatus("PDF recebido. Esta demo usa uma pre-visualizacao arquitetonica local.");
    renderPreview();
    return;
  }
  if (!file.type.startsWith("image/")) {
    setUploadInfo("Formato nao suportado. Usa JPG, PNG, WebP, GIF ou PDF.", "error");
    setStatus("Nao foi possivel carregar esse formato.");
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.imageDataUrl = imageToDataUrl(image);
    URL.revokeObjectURL(objectUrl);
    renderPreview();
    setUploadInfo(`Imagem carregada: ${file.name}`, "ready");
    setStatus("Imagem carregada. Clica em Gerar render gratuito.");
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    state.image = null;
    state.imageDataUrl = "";
    setUploadInfo("Nao consegui ler a imagem. Experimenta JPG, PNG ou WebP.", "error");
    setStatus("Upload falhou: formato de imagem nao suportado pelo browser.");
  };
  image.src = objectUrl;
});

scaleButtons.forEach(button => {
  button.addEventListener("click", () => {
    scaleButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.scale = Number(button.dataset.scale);
    setStatus(`Escala ${state.scale}x selecionada.`);
  });
});

lightButtons.forEach(button => {
  button.addEventListener("click", () => {
    lightButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.light = button.dataset.light;
    renderPreview();
    setStatus(`Luz alterada para ${button.textContent}.`);
  });
});

[mode, style, angle, scene].forEach(control => {
  control.addEventListener("change", () => {
    renderPreview();
    setStatus("Definicoes atualizadas.");
  });
});

generate.addEventListener("click", generateRender);

download.addEventListener("click", () => {
  try {
    const link = document.createElement("a");
    link.download = `renderlivre-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus("PNG descarregado.");
  } catch (error) {
    setStatus("Nao foi possivel descarregar o PNG neste browser.");
  }
});

drawRegion.addEventListener("click", () => {
  state.activeTool = "region";
  setStatus("Clica no render para criar uma regiao editavel.");
});

addMarkup.addEventListener("click", () => {
  state.activeTool = "markup";
  setStatus("Clica no elemento que queres editar.");
});

clearMarks.addEventListener("click", () => {
  state.markups = [];
  state.regions = [];
  renderPreview();
  setStatus("Marcacoes removidas.");
});

canvas.addEventListener("click", event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  if (state.activeTool === "markup") {
    state.markups.push({ x, y });
    setStatus("Ponto de edicao adicionado.");
  } else if (state.activeTool === "region") {
    state.regions.push({ x: x - 95, y: y - 65, w: 190, h: 130 });
    setStatus("Regiao de edicao adicionada.");
  }
  renderPreview();
});

document.querySelectorAll("[data-preset]").forEach(button => {
  button.addEventListener("click", () => {
    style.value = button.dataset.preset;
    promptInput.value = `render ${button.dataset.preset.toLowerCase()}, materiais realistas, composicao profissional`;
    renderPreview();
    location.hash = "studio";
    setStatus(`Preset ${button.dataset.preset} aplicado.`);
  });
});

renderPreview();
setStatus("Pronto para renderizar.");
