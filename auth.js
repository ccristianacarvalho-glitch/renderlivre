import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const loginButton = document.querySelector("#loginGoogle");
const logoutButton = document.querySelector("#logoutGoogle");
const authTitle = document.querySelector("#authTitle");
const authStatus = document.querySelector("#authStatus");

const config = window.RENDERLIVRE_FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.projectId && config.apiKey !== "COLOCA_AQUI");

let currentUser = null;
let auth = null;
let readyResolve;
const ready = new Promise(resolve => {
  readyResolve = resolve;
});

function setAuthUi(user) {
  currentUser = user;
  if (!configured) {
    authTitle.textContent = "Google login por configurar";
    authStatus.textContent = "Preenche firebase-config.js antes de publicar.";
    loginButton.disabled = true;
    logoutButton.classList.add("hidden");
    readyResolve(null);
    return;
  }

  if (user) {
    authTitle.textContent = user.displayName || "Sessao iniciada";
    authStatus.textContent = user.email || "Google autenticado";
    loginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");
  } else {
    authTitle.textContent = "Entrar com Google";
    authStatus.textContent = "Obrigatorio para gerar renders reais.";
    loginButton.classList.remove("hidden");
    logoutButton.classList.add("hidden");
  }
}

if (configured) {
  const app = initializeApp(config);
  auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  loginButton.addEventListener("click", async () => {
    authStatus.textContent = "A abrir Google...";
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      authStatus.textContent = "Login cancelado ou bloqueado.";
    }
  });

  logoutButton.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, user => {
    setAuthUi(user);
    readyResolve(user);
  });
} else {
  setAuthUi(null);
}

window.RenderAuth = {
  ready,
  getUser() {
    return currentUser;
  },
  async getIdToken() {
    await ready;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }
};
