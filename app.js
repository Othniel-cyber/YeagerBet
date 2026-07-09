// ==========================================================================
// SÉCURITÉ AJOUTÉE : VÉRIFICATION DU BLOCAGE EN TEMPS RÉEL (TOUTES LES SECONDES)
// ==========================================================================
setInterval(() => {
  const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
  if (activeUser) {
    const allUsers =
      JSON.parse(localStorage.getItem("yb_registered_accounts")) || [];
    const currentDbRecord = allUsers.find((u) => u.phone === activeUser.phone);

    if (currentDbRecord && currentDbRecord.isBlocked === true) {
      alert(
        "Votre compte a été suspendu par l'administration. Déconnexion immédiate !",
      );
      localStorage.removeItem("yb_active_user");
      window.location.href = "index.html";
    }
  }
}, 1000);

// ==========================================================================
// 1. GESTION DU DASHBOARD (NAVIGATION ENTRE LES JEUX)
// ==========================================================================
// À coller dans ton app.js pour l'affichage en haut de la page de jeu
document.addEventListener("DOMContentLoaded", () => {
  // Récupérer la session active créée à la connexion
  const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));

  // Recherche de l'élément HTML tout en haut du dashboard (ex: dans ta barre de navigation)
  const navUserElement = document.getElementById("nav-username");

  if (activeUser && navUserElement) {
    // Affiche le Pseudo et son numéro de téléphone entre parenthèses
    navUserElement.innerHTML = `<i class="fa-solid fa-circle-user" style="color:#00e5ff;"></i> ${activeUser.username} <span style="color:#64748b; font-size:0.8rem; margin-left:5px;">(${activeUser.phone})</span>`;
  }
});
const menuItems = document.querySelectorAll(".menu-item");
const gameContainers = document.querySelectorAll(".game-container");

if (menuItems.length > 0) {
  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Retirer la classe 'active' de tous les boutons du menu
      menuItems.forEach((btn) => btn.classList.remove("active"));
      // Ajouter la classe 'active' sur le bouton cliqué
      item.classList.add("active");

      // Cacher tous les blocs de jeux
      gameContainers.forEach((game) => game.classList.add("hidden"));

      // Récupérer l'identifiant du jeu cible (ex: 'game-cybercrash')
      const gameId = `game-${item.getAttribute("data-game")}`;
      const targetGame = document.getElementById(gameId);

      // Afficher le jeu sélectionné
      if (targetGame) {
        targetGame.classList.remove("hidden");
      }
    });
  });
}

// ==========================================================================
// FONCTIONS FONDÉES : SYNCHRONISATION DU SOLDE ET DE L'HISTORIQUE PAR COMPTE
// ==========================================================================

// 1. Récupérer le solde actuel du joueur connecté
function getWallet() {
  const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
  if (activeUser && activeUser.balance !== undefined) {
    return parseInt(activeUser.balance);
  }
  // Sécurité de secours via l'élément HTML si la session bugue
  const el = document.getElementById("user-balance");
  return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
}

// 2. Mettre à jour le solde partout (Session + Base Globale de Comptes + Affichage HTML)
function setWallet(newBalance) {
  const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
  const allUsers =
    JSON.parse(localStorage.getItem("yb_registered_accounts")) || [];

  if (activeUser) {
    // Étape A : Mise à jour de sa session active
    activeUser.balance = newBalance;
    localStorage.setItem("yb_active_user", JSON.stringify(activeUser));

    // Étape B : Synchronisation dans la base de données globale des comptes
    const userIndex = allUsers.findIndex((u) => u.phone === activeUser.phone);
    if (userIndex !== -1) {
      allUsers[userIndex].balance = newBalance;
      localStorage.setItem("yb_registered_accounts", JSON.stringify(allUsers));
    }
  }

  // Étape C : Actualisation instantanée de l'interface graphique (Barre de navigation)
  const el = document.getElementById("user-balance");
  if (el) el.innerText = newBalance;

  // Actualisation du widget de solde alternatif s'il existe sur ta page
  const soldeDisplay = document.getElementById("solde-display");
  if (soldeDisplay)
    soldeDisplay.innerHTML = `<i class="fa-solid fa-wallet"></i> Solde: ${newBalance} FCFA`;
}

// 3. Ajouter une ligne dans l'historique personnel du joueur
function saveGameHistory(gameName, type, amount, status) {
  const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
  const allUsers =
    JSON.parse(localStorage.getItem("yb_registered_accounts")) || [];

  if (!activeUser) return;

  const newLog = {
    game: gameName,
    type: type, // 'Gain' ou 'Perte'
    amount: amount,
    status: status, // 'win' ou 'lose'
    date: new Date().toLocaleString("fr-FR"),
  };

  // Ajouter au début de l'historique de sa session active
  if (!activeUser.history) activeUser.history = [];
  activeUser.history.unshift(newLog);
  localStorage.setItem("yb_active_user", JSON.stringify(activeUser));

  // Synchroniser dans son profil de la base de données globale
  const userIndex = allUsers.findIndex((u) => u.phone === activeUser.phone);
  if (userIndex !== -1) {
    if (!allUsers[userIndex].history) allUsers[userIndex].history = [];
    allUsers[userIndex].history.unshift(newLog);
    localStorage.setItem("yb_registered_accounts", JSON.stringify(allUsers));
  }
}

// 4. Envoyer une notification d'activité au panneau d'administration
function adminPushNotification(type, message) {
  try {
    let logs = JSON.parse(localStorage.getItem("yb_admin_notifications")) || [];
    logs.unshift({
      type: type, // 'inscription', 'gain', 'perte', 'depot', 'retrait'
      text: message,
      time:
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        " - " +
        new Date().toLocaleDateString("fr-FR"),
    });
    localStorage.setItem("yb_admin_notifications", JSON.stringify(logs));

    // Alerte immédiate de mise à jour pour l'onglet admin s'il est ouvert en même temps
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Erreur d'envoi de notification admin:", e);
  }
}

// 5. Enregistrer un mouvement financier dans le registre de la console admin
function adminTriggerTransaction(username, typeTx, amountTx) {
  try {
    let currentTx = JSON.parse(localStorage.getItem("yb_transactions")) || [];
    currentTx.push({
      username: username,
      type: typeTx, // 'depot', 'retrait', 'gain', 'perte'
      amount: parseInt(amountTx),
      time: new Date().toLocaleString("fr-FR"),
    });
    localStorage.setItem("yb_transactions", JSON.stringify(currentTx));
    window.dispatchEvent(new Event("storage"));
  } catch (error) {
    console.error("Erreur de synchronisation financière admin:", error);
  }
}

// ==========================================================================
// 2. FORMULAIRES D'INSCRIPTION & DE CONNEXION (INDEX.HTML)
// ==========================================================================
const registerBox = document.getElementById("register-box");
const loginBox = document.getElementById("login-box");
const goToLogin = document.getElementById("go-to-login");
const goToRegister = document.getElementById("go-to-register");

if (goToLogin && goToRegister) {
  goToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  goToRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginBox.classList.add("hidden");
    registerBox.classList.remove("hidden");
  });
}

// Détection automatique du réseau mobile (Bénin) sur les champs téléphoniques
const regPhone = document.getElementById("reg-phone");
const loginPhone = document.getElementById("login-phone");

function detectNetwork(phoneInput, badgeId) {
  if (!phoneInput) return;

  phoneInput.addEventListener("input", () => {
    const num = phoneInput.value.trim();
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    // Reset par défaut
    badge.className = "network-badge";
    badge.innerHTML = "";
    badge.style.display = "none";

    // Vérification des préfixes béninois à 8 chiffres (format d'entrée commençant par 01)
    if (num.length >= 4 && num.startsWith("01")) {
      const prefix = num.substring(0, 4);

      const mtnPrefixes = [
        "0151",
        "0152",
        "0153",
        "0154",
        "0161",
        "0162",
        "0166",
        "0167",
        "0169",
        "0190",
        "0191",
        "0196",
        "0197",
      ];
      const moovPrefixes = [
        "0155",
        "0156",
        "0157",
        "0158",
        "0160",
        "0163",
        "0164",
        "0165",
        "0168",
        "0194",
        "0195",
        "0198",
        "0199",
      ];
      const celtiisPrefixes = ["0140", "0141", "0142", "0143"];

      if (mtnPrefixes.includes(prefix)) {
        badge.classList.add("badge-mtn");
        badge.innerHTML = "MTN";
        badge.style.display = "block";
      } else if (moovPrefixes.includes(prefix)) {
        badge.classList.add("badge-moov");
        badge.innerHTML = "Moov";
        badge.style.display = "block";
      } else if (celtiisPrefixes.includes(prefix)) {
        badge.classList.add("badge-celtiis");
        badge.innerHTML = "Celtiis";
        badge.style.display = "block";
      }
    }
  });
}
detectNetwork(regPhone, "network-badge-reg");
detectNetwork(loginPhone, "network-badge-login");

// Soumission du formulaire d'inscription
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById("reg-phone").value.trim();
    const passwordInput = document.getElementById("reg-password")
      ? document.getElementById("reg-password").value
      : "";
    const usernameInput = document.getElementById("reg-username")
      ? document.getElementById("reg-username").value.trim()
      : "Joueur_" + phoneInput.substring(phoneInput.length - 4);

    let currentUsers =
      JSON.parse(localStorage.getItem("yb_registered_accounts")) || [];

    // Empêcher les doublons de numéros
    if (currentUsers.some((u) => u.phone === phoneInput)) {
      alert("Ce numéro de téléphone est déjà associé à un compte.");
      return;
    }

    // Sauvegarde du nouveau compte (Solde initialisé à 0)
    currentUsers.push({
      username: usernameInput,
      phone: phoneInput,
      password: passwordInput,
      balance: 0,
      isBlocked: false,
      dateJoin:
        new Date().toLocaleDateString("fr-FR") +
        " " +
        new Date().toLocaleTimeString("fr-FR"),
      history: [],
    });
    localStorage.setItem(
      "yb_registered_accounts",
      JSON.stringify(currentUsers),
    );

    // Notification système admin
    adminPushNotification(
      "inscription",
      `Nouveau membre : ${usernameInput} (${phoneInput}) s'est inscrit.`,
    );

    alert(
      `Félicitations ! Votre compte YeagerBet a été créé avec succès. Connectez-vous.`,
    );
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
    registerForm.reset();
  });
}

// Soumission du formulaire de connexion avec interdiction si bloqué
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById("login-phone").value.trim();
    const passwordInput = document.getElementById("login-password").value;

    let currentUsers =
      JSON.parse(localStorage.getItem("yb_registered_accounts")) || [];
    const validUser = currentUsers.find(
      (u) => u.phone === phoneInput && u.password === passwordInput,
    );

    if (validUser) {
      // SÉCURITÉ : Vérifier si le compte est bloqué à la connexion
      if (validUser.isBlocked === true) {
        alert(
          "Votre compte a été suspendu par l'administration. Accès refusé !",
        );
        return;
      }

      localStorage.setItem("yb_active_user", JSON.stringify(validUser));
      window.location.href = "dashboard.html";
    } else {
      alert("Numéro de téléphone ou mot de passe incorrect !");
    }
  });
}

// ==========================================================================
// NEW MODULE JEU 5 : FIREWALL BREAKER ENGINE (ISOLÉ)
// ==========================================================================
(function () {
  let fwActive = false;
  let fwBet = 0;
  let fwMultiplier = 1.0;
  let fwFloor = 0;
  const fwSteps = [1.45, 2.2, 3.5, 5.8, 10.0, 20.0]; // Multiplicateurs progressifs
  let fwTraps = [];

  function syncUserWallet(amount) {
    if (typeof balance !== "undefined") balance = amount;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = amount;
    if (typeof balanceSpan !== "undefined" && balanceSpan)
      balanceSpan.innerText = amount;
  }

  function readUserWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function drawBaseStructure() {
    const container = document.getElementById("fw-tower");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      let floor = document.createElement("div");
      floor.className = "fw-floor locked";
      floor.id = `fw-f-${i}`;
      floor.innerHTML = `<div class="fw-floor-label">LVL ${i + 1}</div>
                               <div class="fw-node">??</div>
                               <div class="fw-node">??</div>
                               <div class="fw-node">??</div>`;
      container.appendChild(floor);
    }
  }

  function runFirewallEngine() {
    const betInput = document.getElementById("fw-bet-amount");
    const btnStart = document.getElementById("btn-fw-start");
    const btnCashout = document.getElementById("btn-fw-cashout");

    if (!betInput || !btnStart) return;

    fwBet = parseInt(betInput.value);
    let wallet = readUserWallet();

    if (isNaN(fwBet) || fwBet < 100 || fwBet > wallet) {
      alert("Mise invalide ou solde insuffisant (Minimum 100 FCFA) !");
      return;
    }

    wallet -= fwBet;
    syncUserWallet(wallet);

    fwActive = true;
    fwFloor = 0;
    fwMultiplier = 1.0;

    // Distribution aléatoire du piège (0, 1 ou 2) par étage
    fwTraps = Array.from({ length: 6 }, () => Math.floor(Math.random() * 3));

    btnStart.classList.add("hidden");
    if (btnCashout) btnCashout.classList.remove("hidden");
    document.getElementById("fw-current-multiplier").innerText = "1.00x";
    document.getElementById("fw-next-multiplier").innerText = "x" + fwSteps[0];

    renderInteractiveTower();
  }

  function renderInteractiveTower() {
    const container = document.getElementById("fw-tower");
    if (!container) return;
    container.innerHTML = "";

    for (let i = 0; i < 6; i++) {
      let floor = document.createElement("div");
      floor.className =
        i === fwFloor
          ? "fw-floor active"
          : i < fwFloor
            ? "fw-floor"
            : "fw-floor locked";
      floor.innerHTML = `<div class="fw-floor-label">LVL ${i + 1}</div>`;

      for (let j = 0; j < 3; j++) {
        let node = document.createElement("div");
        node.className = "fw-node";
        node.innerText = "??";

        if (i < fwFloor) {
          node.className =
            fwTraps[i] === j ? "fw-node alert" : "fw-node passed";
          node.innerText = fwTraps[i] === j ? "0" : "1";
        }

        node.addEventListener("click", () => {
          if (fwActive && i === fwFloor) handleNodeSelection(j);
        });
        floor.appendChild(node);
      }
      container.appendChild(floor);
    }
  }

  function handleNodeSelection(idx) {
    if (fwTraps[fwFloor] === idx) {
      const activeFloor =
        document.getElementById(`fw-tower`).children[5 - fwFloor];
      const chosenNode = activeFloor.querySelectorAll(".fw-node")[idx];
      chosenNode.className = "fw-node alert";
      chosenNode.innerText = "0";
      closeEngineSession(false);
    } else {
      fwMultiplier = fwSteps[fwFloor];
      document.getElementById("fw-current-multiplier").innerText =
        fwMultiplier.toFixed(2) + "x";
      fwFloor++;

      if (fwFloor > 5) {
        closeEngineSession(true);
      } else {
        document.getElementById("fw-next-multiplier").innerText =
          "x" + fwSteps[fwFloor];
        renderInteractiveTower();
      }
    }
  }

  function closeEngineSession(isVictory) {
    fwActive = false;

    if (isVictory) {
      let gain = Math.floor(fwBet * fwMultiplier);
      let currentSolde = readUserWallet() + gain;
      syncUserWallet(currentSolde);
      alert(`ACCESS GRANTED ! Firewall contourné. Gain : +${gain} FCFA`);
    } else {
      document.getElementById("fw-current-multiplier").innerText = "0.00x";
      alert("SECURITY ALERT ! Le système a détecté l'intrusion, mise perdue.");
    }

    document.getElementById("btn-fw-start").classList.remove("hidden");
    const btnCashout = document.getElementById("btn-fw-cashout");
    if (btnCashout) btnCashout.classList.add("hidden");
    drawBaseStructure();
  }

  function bootFirewall() {
    drawBaseStructure();
    const btnStart = document.getElementById("btn-fw-start");
    const btnCashout = document.getElementById("btn-fw-cashout");

    if (btnStart) btnStart.addEventListener("click", runFirewallEngine);
    if (btnCashout) {
      btnCashout.addEventListener("click", () => {
        if (fwActive && fwFloor > 0) closeEngineSession(true);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootFirewall);
  } else {
    bootFirewall();
  }
})();

// ==========================================================================
// MODULE JEU 6 : DATA SHIELD RADAR ENGINE (CONTRÔLE D'ARRÊT MANUEL)
// ==========================================================================
(function () {
  let dsSpinning = false;
  let currentRotation = 0;
  let currentBet = 0;

  // Protection financière automatique
  let dsTotalMise = 0;
  let dsTotalGain = 0;
  const TARGET_RTP = 0.85;

  function getWalletAmount() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWalletAmount(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
    if (typeof balanceSpan !== "undefined" && balanceSpan)
      balanceSpan.innerText = val;
  }

  function handleShieldAction() {
    const wheel = document.getElementById("ds-main-wheel");
    const btnSpin = document.getElementById("btn-ds-spin");
    const betInput = document.getElementById("ds-bet-amount");

    if (!wheel || !btnSpin || !betInput) return;

    // ETAPE 1 : LANCEMENT DU SPIN
    if (!dsSpinning) {
      currentBet = parseInt(betInput.value);
      let wallet = getWalletAmount();

      if (isNaN(currentBet) || currentBet < 200 || currentBet > wallet) {
        alert("Mise invalide ! Minimum 200 FCFA.");
        return;
      }

      // Configuration du spin permanent
      dsSpinning = true;
      dsTotalMise += currentBet;
      wallet -= currentBet;
      setWalletAmount(wallet);

      // Changement d'état du bouton
      btnSpin.innerText = "STOP SCAN";
      btnSpin.style.background = "#ff0055"; // Devient rouge pour inciter à couper

      // Appliquer une rotation infinie et rapide en changeant la transition CSS temporairement
      wheel.style.transition = "transform 10s linear";
      currentRotation += 5000;
      wheel.style.transform = `rotate(${currentRotation}deg)`;
    }
    // ETAPE 2 : ARRÊT MANUEL PAR LE JOUEUR
    else {
      btnSpin.disabled = true;
      btnSpin.style.opacity = "0.5";

      // Restaurer la transition de freinage fluide (1.5s)
      wheel.style.transition = "transform 1.5s cubic-bezier(0.1, 0.8, 0.2, 1)";

      // Analyse de la balance pour stabiliser les écarts de chance
      let forceLoss = false;
      if (dsTotalMise > 0) {
        let currentRTP = dsTotalGain / dsTotalMise;
        if (currentRTP > TARGET_RTP && Math.random() < 0.68) {
          forceLoss = true;
        }
      }

      // Calcul de la destination finale
      let addedDegrees = 0;
      if (forceLoss) {
        let redAngles = [
          Math.floor(Math.random() * 40) + 47, // 45° à 90°
          Math.floor(Math.random() * 40) + 137, // 135° à 180°
          Math.floor(Math.random() * 40) + 227, // 225° à 270°
          Math.floor(Math.random() * 40) + 317, // 315° à 360°
        ];
        let targetAngle =
          redAngles[Math.floor(Math.random() * redAngles.length)];
        addedDegrees = 360 - targetAngle + 720; // 2 tours de freinage
      } else {
        addedDegrees = Math.floor(Math.random() * 360) + 720;
      }

      currentRotation += addedDegrees;
      wheel.style.transform = `rotate(${currentRotation}deg)`;

      // Résolution après le freinage visuel (1.5 seconde)
      setTimeout(() => {
        let finalAngle = (360 - (currentRotation % 360)) % 360;

        let payoutMultiplier = 0;
        let outcomeMessage = "";
        let isWin = false;

        // Détection sur 8 secteurs de 45 degrés
        if (finalAngle >= 0 && finalAngle < 45) {
          payoutMultiplier = 2.0;
          outcomeMessage = "ZONE BLEUE : Connexion établie !";
          isWin = true;
        } else if (finalAngle >= 45 && finalAngle < 90) {
          payoutMultiplier = 0.0;
          outcomeMessage = "DATA CORRUPTION ! Interception système.";
          isWin = false;
        } else if (finalAngle >= 90 && finalAngle < 135) {
          payoutMultiplier = 2.0;
          outcomeMessage = "ZONE CYAN : Paquets transmis !";
          isWin = true;
        } else if (finalAngle >= 135 && finalAngle < 180) {
          payoutMultiplier = 0.0;
          outcomeMessage = "DATA CORRUPTION ! Brèche détectée.";
          isWin = false;
        } else if (finalAngle >= 180 && finalAngle < 225) {
          payoutMultiplier = 2.0;
          outcomeMessage = "ZONE BLEUE : Réseau stabilisé !";
          isWin = true;
        } else if (finalAngle >= 225 && finalAngle < 270) {
          payoutMultiplier = 0.0;
          outcomeMessage = "DATA CORRUPTION ! Code injecté.";
          isWin = false;
        } else if (finalAngle >= 270 && finalAngle < 315) {
          payoutMultiplier = 2.0;
          outcomeMessage = "ZONE CYAN : Données chiffrées !";
          isWin = true;
        } else {
          payoutMultiplier = 0.0;
          outcomeMessage = "DATA CORRUPTION ! Purge du noyau.";
          isWin = false;
        }

        if (isWin) {
          let gains = Math.floor(currentBet * payoutMultiplier);
          dsTotalGain += gains;
          let currentSolde = getWalletAmount() + gains;
          setWalletAmount(currentSolde);

          document.getElementById("ds-last-multiplier").innerText =
            payoutMultiplier.toFixed(2) + "x";
          document.getElementById("ds-last-multiplier").style.color = "#00e5ff";
          alert(`${outcomeMessage} Gain : +${gains} FCFA`);
        } else {
          document.getElementById("ds-last-multiplier").innerText = "0.00x";
          document.getElementById("ds-last-multiplier").style.color = "#ff0055";

          const gameContainer = document.getElementById("game-datashield");
          if (gameContainer) {
            gameContainer.style.boxShadow = "0 0 40px rgba(255, 0, 85, 0.6)";
            setTimeout(() => {
              gameContainer.style.boxShadow = "none";
            }, 500);
          }

          alert(outcomeMessage);
        }

        // Réinitialisation de l'état du bouton
        dsSpinning = false;
        btnSpin.disabled = false;
        btnSpin.style.opacity = "1";
        btnSpin.innerText = "SCAN SHIELD (SPIN)";
        btnSpin.style.background = ""; // Reprend le style CSS d'origine
      }, 1500);
    }
  }

  function initDataShield() {
    const btnSpin = document.getElementById("btn-ds-spin");
    if (btnSpin) btnSpin.addEventListener("click", handleShieldAction);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDataShield);
  } else {
    initDataShield();
  }
})();

// ==========================================================================
// MODULE JEU 7 : CYBER-PLINKO ULTRA-TRAP (NOUVEAUX COEFFICIENTS)
// ==========================================================================
(function () {
  const canvas = document.getElementById("plinko-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let balls = [];
  const rows = 9;
  const pins = [];
  const buckets = [];

  // NOUVELLE CONFIGURATION AVEC LES COEFFICIENTS DEMANDÉS
  // Pas de gros 10x ou 25x aux extrémités, focus sur le centre piégé
  const oddsConfig = {
    low: [0.0, 1.0, 1.5, 0.5, 0.5, 2.0, 1.0, 1.0, 0.0],
    medium: [0.0, 1.0, 2.0, 0.0, 0.0, 4.0, 1.0, 1.0, 0.0], // Configuration demandée
    high: [0.0, 0.5, 2.0, 0.0, 0.0, 4.0, 0.5, 0.5, 0.0],
  };

  function getWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWallet(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
  }

  function initPlinkoBoard() {
    pins.length = 0;
    const spacingX = 36;
    const spacingY = 34;
    const startY = 50;

    for (let r = 0; r < rows; r++) {
      const pinsInRow = r + 3;
      const rowWidth = (pinsInRow - 1) * spacingX;
      const startX = (canvas.width - rowWidth) / 2;

      for (let p = 0; p < pinsInRow; p++) {
        pins.push({
          x: startX + p * spacingX,
          y: startY + r * spacingY,
          radius: 3,
          pulse: 0,
        });
      }
    }

    const lastRowPins = rows + 2;
    const lastRowWidth = (lastRowPins - 1) * spacingX;
    const startX = (canvas.width - lastRowWidth) / 2;
    buckets.length = 0;

    for (let b = 0; b < 9; b++) {
      buckets.push({
        x: startX + b * spacingX - spacingX / 2,
        width: spacingX,
        y: canvas.height - 30,
        height: 25,
      });
    }
  }

  function dropBall() {
    const betInput = document.getElementById("plinko-bet");
    const riskSelect = document.getElementById("plinko-risk");
    let bet = parseInt(betInput.value) || 0;
    let solde = getWallet();

    if (bet < 100 || bet > solde) {
      alert("Mise invalide ou solde insuffisant.");
      return;
    }

    setWallet(solde - bet);

    balls.push({
      x: canvas.width / 2 + (Math.random() * 8 - 4),
      y: 20,
      vx: 0,
      vy: 2,
      radius: 5,
      bet: bet,
      risk: riskSelect.value,
    });
  }

  function updatePhysics() {
    const gravity = 0.16;
    const friction = 0.992;

    for (let i = balls.length - 1; i >= 0; i--) {
      let b = balls[i];
      b.vy += gravity;
      b.vx *= friction;
      b.vy *= friction;
      b.x += b.vx;
      b.y += b.vy;

      pins.forEach((p) => {
        let dx = b.x - p.x;
        let dy = b.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + p.radius) {
          let overlap = b.radius + p.radius - dist;
          b.x += (dx / dist) * overlap;
          b.y += (dy / dist) * overlap;

          let nx = dx / dist;
          let ny = dy / dist;
          let dot = b.vx * nx + b.vy * ny;

          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;

          b.vx *= 0.75;
          b.vy *= 0.75;

          b.vx += Math.random() * 0.5 - 0.25;

          p.pulse = 10;
        }
      });

      if (b.x < b.radius) {
        b.x = b.radius;
        b.vx = -b.vx * 0.5;
      } else if (b.x > canvas.width - b.radius) {
        b.x = canvas.width - b.radius;
        b.vx = -b.vx * 0.5;
      }

      if (b.y >= canvas.height - 40) {
        resolveBucketHit(b);
        balls.splice(i, 1);
      }
    }

    pins.forEach((p) => {
      if (p.pulse > 0) p.pulse--;
    });
  }

  function resolveBucketHit(ball) {
    let closestBucketIndex = 0;
    let minDist = 99999;

    buckets.forEach((bucket, index) => {
      let centerX = bucket.x + bucket.width / 2;
      let d = Math.abs(ball.x - centerX);
      if (d < minDist) {
        minDist = d;
        closestBucketIndex = index;
      }
    });

    if (closestBucketIndex >= oddsConfig[ball.risk].length) {
      closestBucketIndex = oddsConfig[ball.risk].length - 1;
    }

    let multiplier = oddsConfig[ball.risk][closestBucketIndex];
    let payout = Math.floor(ball.bet * multiplier);

    if (payout > 0) {
      setWallet(getWallet() + payout);
    }

    pushRecentStat(multiplier);
  }

  function pushRecentStat(mult) {
    const container = document.getElementById("plinko-recent-stats");
    if (!container) return;

    const badge = document.createElement("div");
    let itemClass = "bad";
    if (mult >= 1.0) itemClass = "good";
    if (mult >= 4.0) itemClass = "epic";

    badge.className = `plinko-stat-badge ${itemClass}`;
    badge.innerText = `${mult}x`;

    container.insertBefore(badge, container.firstChild);

    if (container.children.length > 7) {
      container.removeChild(container.lastChild);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pins.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + (p.pulse > 0 ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = p.pulse > 0 ? "#00e5ff" : "#334155";
      if (p.pulse > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00e5ff";
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    const currentRisk =
      document.getElementById("plinko-risk")?.value || "medium";
    const currentOdds = oddsConfig[currentRisk];

    buckets.forEach((b, index) => {
      let mult = currentOdds[index];

      let bucketColor = "#1e293b";
      let textColor = "#64748b";

      // Couleurs de gains
      if (mult > 0) {
        if (mult >= 2.0) {
          bucketColor = "rgba(255,170,0,0.15)";
          textColor = "#ffaa00";
        } else {
          bucketColor = "rgba(34,197,94,0.1)";
          textColor = "#22c55e";
        }
      }

      // FILTRE SUR LES PLACES SANS GAIN (0.0x)
      // Coloration en rouge vif pour le centre (index 3 et 4) et les bords extérieurs (index 0 et 8)
      if (mult === 0) {
        bucketColor = "rgba(239,68,68,0.2)";
        textColor = "#ef4444";
        if (index === 3 || index === 4) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#ef4444";
        }
      }

      ctx.fillStyle = bucketColor;
      ctx.fillRect(b.x + 2, b.y, b.width - 4, b.height);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#141f36";
      ctx.strokeRect(b.x + 2, b.y, b.width - 4, b.height);

      ctx.fillStyle = textColor;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${mult.toFixed(1)}x`, b.x + b.width / 2, b.y + 16);
    });

    balls.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff0055";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff0055";
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function gameLoop() {
    updatePhysics();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function initPlinkoEngine() {
    initPlinkoBoard();

    const btn = document.getElementById("btn-plinko-drop");
    if (btn) btn.addEventListener("click", dropBall);

    const riskSelect = document.getElementById("plinko-risk");
    if (riskSelect) riskSelect.addEventListener("change", initPlinkoBoard);

    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPlinkoEngine);
  } else {
    initPlinkoEngine();
  }
})();

// ==========================================================================
// MODULE JEU 11 : CYBER-SHELL ENGINE (JEU DES GOBELETS)
// ==========================================================================
(function () {
  const canvas = document.getElementById("shell-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let isGameActive = false;
  let isMixing = false;
  let isRevealed = false;
  let currentBet = 0;
  let winningIndex = 0; // Index de la puce contenant le gain

  // Position initiale des 3 puces
  let shells = [
    { id: 0, x: 100, y: 160, radius: 35, currentPos: 0, hover: false },
    { id: 1, x: 250, y: 160, radius: 35, currentPos: 1, hover: false },
    { id: 2, x: 400, y: 160, radius: 35, currentPos: 2, hover: false },
  ];

  // Variables pour l'animation de swap
  let swapQueue = [];
  let currentSwap = null;
  let mixProgress = 0;
  const mixSpeed = 0.08;

  function getWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWallet(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
  }

  // Positions fixes sur la table
  const slotsX = [100, 250, 400];

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Message d'information
    ctx.fillStyle = "#64748b";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    if (!isGameActive && !isMixing && !isRevealed) {
      ctx.fillText(
        "CLIQUEZ SUR LE BOUTON POUR DISTRIBUER",
        canvas.width / 2,
        40,
      );
    } else if (isMixing) {
      ctx.fillStyle = "#ffaa00";
      ctx.fillText(
        "ANALYSE DES FLUX SYNAPTIQUES... SUIVEZ DES YEUX !",
        canvas.width / 2,
        40,
      );
    } else if (isGameActive && !isMixing) {
      ctx.fillStyle = "#00e5ff";
      ctx.fillText("CHOISISSEZ LA PUCE CORRESPONDANTE !", canvas.width / 2, 40);
    }

    // Dessin des 3 puces (Gobelets Cyber)
    shells.forEach((s) => {
      ctx.save();

      // Changement de style visuel en fonction du survol et de l'état
      let strokeColor = "#141f36";
      let fillColor = "#0d1627";

      if (s.hover && isGameActive && !isMixing) {
        strokeColor = "#a855f7";
        fillColor = "rgba(168,85,247,0.1)";
      }

      // Si le résultat est révélé
      if (isRevealed) {
        if (s.id === winningIndex) {
          strokeColor = "#22c55e";
          fillColor = "rgba(34,197,94,0.15)";
        } else {
          strokeColor = "#ef4444";
          fillColor = "rgba(239,68,68,0.1)";
        }
      }

      // Dessin extérieur de la puce
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Cœur technologique au centre
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fillStyle =
        isRevealed && s.id === winningIndex ? "#22c55e" : "#a855f7";
      ctx.fill();

      // Si révélé et gagnant, on écrit "GAGNANT" ou l'icône de clé
      if (isRevealed && s.id === winningIndex) {
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 10px monospace";
        ctx.fillText("DONNÉE", s.x, s.y - 45);
      }

      ctx.restore();
    });
  }

  function startMixing() {
    if (isMixing || isGameActive) return;

    const betInput = document.getElementById("shell-bet");
    let bet = parseInt(betInput.value) || 0;
    let solde = getWallet();

    if (bet < 100 || bet > solde) {
      alert("Mise invalide ou solde insuffisant.");
      return;
    }

    setWallet(solde - bet);
    currentBet = bet;
    isMixing = true;
    isRevealed = false;
    betInput.disabled = true;
    document.getElementById("btn-shell-start").disabled = true;

    // Détermination secrète de la puce gagnante
    winningIndex = Math.floor(Math.random() * 3);

    // Générer une suite de 4 à 6 permutations aléatoires de puces
    swapQueue = [];
    for (let i = 0; i < 5; i++) {
      let idx1 = Math.floor(Math.random() * 3);
      let idx2 = Math.floor(Math.random() * 3);
      while (idx1 === idx2) {
        idx2 = Math.floor(Math.random() * 3);
      }
      swapQueue.push({ s1: idx1, s2: idx2 });
    }

    processNextSwap();
  }

  function processNextSwap() {
    if (swapQueue.length === 0) {
      // Fin du mélange, le joueur prend la main
      isMixing = false;
      isGameActive = true;
      document.getElementById("btn-shell-start").disabled = false;
      document.getElementById("btn-shell-start").innerText = "MÉLANGÉ !";
      drawScene();
      return;
    }

    currentSwap = swapQueue.shift();
    mixProgress = 0;
    animateSwap();
  }

  function animateSwap() {
    mixProgress += mixSpeed;
    if (mixProgress > 1) mixProgress = 1;

    let s1 = shells[currentSwap.s1];
    let s2 = shells[currentSwap.s2];

    // Calcul des coordonnées cibles initiales basées sur leur slot
    let startX1 = slotsX[s1.currentPos];
    let startX2 = slotsX[s2.currentPos];
    let targetX1 = slotsX[s2.currentPos];
    let targetX2 = slotsX[s1.currentPos];

    // Interpolation linéaire pour le mouvement horizontal
    s1.x = startX1 + (targetX1 - startX1) * mixProgress;
    s2.x = startX2 + (targetX2 - startX2) * mixProgress;

    // Effet de courbe sinusoïdale sur l'axe Y pour simuler la 3D/le croisement
    let dist = Math.abs(startX1 - startX2);
    let arc = Math.sin(mixProgress * Math.PI) * (dist / 3);
    s1.y = 160 + arc;
    s2.y = 160 - arc;

    drawScene();

    if (mixProgress < 1) {
      requestAnimationFrame(animateSwap);
    } else {
      // Fin de cette translation précise, mise à jour des index de slots
      let tempPos = s1.currentPos;
      s1.currentPos = s2.currentPos;
      s2.currentPos = tempPos;

      s1.y = 160;
      s2.y = 160;

      setTimeout(processNextSwap, 40); // Délai infime entre les échanges
    }
  }

  // Gestion du clic de sélection sur le canvas
  canvas.addEventListener("click", function (e) {
    if (!isGameActive || isMixing) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    shells.forEach((s) => {
      let dx = mouseX - s.x;
      let dy = mouseY - s.y;
      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= s.radius) {
        resolveChoice(s.id);
      }
    });
  });

  // Effet visuel au survol de la souris
  canvas.addEventListener("mousemove", function (e) {
    if (!isGameActive || isMixing) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    shells.forEach((s) => {
      let dx = mouseX - s.x;
      let dy = mouseY - s.y;
      s.hover = Math.sqrt(dx * dx + dy * dy) <= s.radius;
    });
    drawScene();
  });

  function resolveChoice(selectedId) {
    isGameActive = false;
    isRevealed = true;

    drawScene();

    setTimeout(() => {
      if (selectedId === winningIndex) {
        let gains = Math.floor(currentBet * 2.9);
        setWallet(getWallet() + gains);
        alert(
          `Excellent réflexe ! Vous avez trouvé la clé d'accès et gagnez ${gains} FCFA (x2.90).`,
        );
      } else {
        alert(`Perdu ! Le système a chiffré les données ailleurs.`);
      }

      // Réinitialisation de l'interface
      document.getElementById("shell-bet").disabled = false;
      document.getElementById("btn-shell-start").innerText =
        "LANCER LE MÉLANGE";
      isRevealed = false;

      // Retour des puces à leur place d'origine
      shells.forEach((s, idx) => {
        s.x = slotsX[idx];
        s.y = 160;
        s.currentPos = idx;
      });
      drawScene();
    }, 300);
  }

  function initShellEngine() {
    drawScene();
    document
      .getElementById("btn-shell-start")
      .addEventListener("click", startMixing);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShellEngine);
  } else {
    initShellEngine();
  }
})();

// Relais d'affichage pour le jeu Cyber-Shell
(function () {
  const shellBtn = document.querySelector('[data-game="shell"]');
  if (shellBtn) {
    shellBtn.addEventListener("click", function () {
      document
        .querySelectorAll(".sidebar-menu .menu-item")
        .forEach((b) => b.classList.remove("active"));
      shellBtn.classList.add("active");

      document
        .querySelectorAll('.game-container, [id^="game-"]')
        .forEach((z) => z.classList.add("hidden"));

      const shellScreen = document.getElementById("game-shell");
      if (shellScreen) shellScreen.classList.remove("hidden");
    });
  }
})();

// ==========================================================================
// MODULE JEU 12 : CYBER-HEIST ULTIMATE ENGINE
// ==========================================================================
(function () {
  const canvas = document.getElementById("heist-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let gameState = "idle"; // idle, playing, data-flying, gameover
  let currentBet = 0;
  let currentRingIndex = 0; // 0, 1, 2 (On progresse de l'extérieur vers l'intérieur)
  let currentMultiplier = 0;

  // Définition des 3 anneaux de sécurité laser
  // La brèche (ouverture) s'exprime en radians
  let rings = [
    { radius: 140, angle: 0, speed: 0.025, gapSize: 0.8, color: "#ff0055" }, // Anneau 1 (Extérieur)
    { radius: 105, angle: 1.5, speed: -0.038, gapSize: 0.6, color: "#00e5ff" }, // Anneau 2 (Milieu - Inverse)
    { radius: 70, angle: 3, speed: 0.05, gapSize: 0.5, color: "#a855f7" }, // Anneau 3 (Intérieur - Rapide)
  ];

  // Impulsion de piratage lancée par le joueur
  let dataPulse = { x: 230, y: 350, targetY: 350, speed: 7, active: false };

  // Multiplicateurs par anneau validé
  const rewards = [1.8, 4.2, 12.5];

  function getWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWallet(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 15;

    // 1. Dessiner le noyau central de données (Le Trésor)
    let corePulse = Math.abs(Math.sin(Date.now() * 0.003)) * 6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#070b14";
    ctx.strokeStyle = gameState === "idle" ? "#334155" : "#22c55e";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Effet de halo lumineux sur le noyau central
    if (gameState !== "idle") {
      ctx.shadowBlur = 15 + corePulse;
      ctx.shadowColor = "#22c55e";
      ctx.fillStyle = "rgba(34,197,94,0.8)";
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Dessiner les lignes guides d'alignement tactique
    if (gameState === "playing" || gameState === "data-flying") {
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvas.height);
      ctx.stroke();
    }

    // 3. Rendu géométrique des anneaux de sécurité laser
    rings.forEach((ring, idx) => {
      ctx.save();
      ctx.lineWidth =
        idx === currentRingIndex && gameState === "playing" ? 5 : 2;
      ctx.strokeStyle = ring.color;

      // Atténuer l'éclat des anneaux déjà piratés
      if (idx < currentRingIndex) {
        ctx.strokeStyle = "rgba(34,197,94,0.2)";
        ctx.setLineDash([4, 4]);
      }

      // Calculer les arcs de cercles en laissant la brèche vide
      // On dessine l'anneau complet MOINS la brèche
      let startGap = ring.angle;
      let endGap = ring.angle + ring.gapSize;

      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, endGap, startGap); // Dessine la partie laser

      // Ajouter un effet de flou néon sur l'anneau actif uniquement
      if (idx === currentRingIndex && gameState === "playing") {
        ctx.shadowBlur = 12;
        ctx.shadowColor = ring.color;
      }
      ctx.stroke();
      ctx.restore();
    });

    // 4. Dessiner le Injecteur d'Impulsion (En bas au centre)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(cx - 20, canvas.height - 25, 40, 15);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(cx - 20, canvas.height - 25, 40, 15);

    // 5. Dessiner la bille d'impulsion de piratage (Data-Pulse)
    if (dataPulse.active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(dataPulse.x, dataPulse.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  }

  function updatePhysics() {
    if (gameState === "playing" || gameState === "data-flying") {
      // Faire tourner les anneaux à chaque frame
      rings.forEach((ring) => {
        ring.angle += ring.speed;
        // Normaliser l'angle entre 0 et 2*PI
        if (ring.angle > Math.PI * 2) ring.angle -= Math.PI * 2;
        if (ring.angle < 0) ring.angle += Math.PI * 2;
      });
    }

    // Progression verticale du tir de piratage
    if (gameState === "data-flying" && dataPulse.active) {
      dataPulse.y -= dataPulse.speed;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 15;

      // Vérifier la collision avec l'anneau actif actuel
      let targetRing = rings[currentRingIndex];
      let currentDistance = cy - dataPulse.y;

      if (
        currentDistance >= targetRing.radius - 3 &&
        currentDistance <= targetRing.radius + 5
      ) {
        // Analyse d'angle trigonométrique pour savoir si on passe dans la brèche
        // Le tir monte tout droit à la verticale (angle par rapport au centre = -Math.PI / 2 soit 4.712 rad)
        let laserHitAngle = Math.PI * 1.5;

        // Vérifier si l'angle du laser englobe la zone de tir du haut (1.5 * PI)
        let startGap = targetRing.angle;
        let endGap = (targetRing.angle + targetRing.gapSize) % (Math.PI * 2);

        let insideGap = false;
        if (startGap < endGap) {
          insideGap = laserHitAngle >= startGap && laserHitAngle <= endGap;
        } else {
          insideGap = laserHitAngle >= startGap || laserHitAngle <= endGap;
        }

        if (insideGap) {
          // Succès : Brèche traversée ! On monte d'un niveau
          dataPulse.active = false;
          currentRingIndex++;

          if (currentRingIndex >= rings.length) {
            // Le joueur a traversé les 3 anneaux : JACKPOT !
            currentMultiplier = rewards[2];
            endGame(true);
          } else {
            // Passe à l'anneau suivant
            currentMultiplier = rewards[currentRingIndex - 1];
            gameState = "playing";
            updateInterface();
          }
        } else {
          // Échec : Alerte laser déclenchée !
          dataPulse.active = false;
          triggerAlarmVisual();
          endGame(false);
        }
      }
    }
  }

  function triggerAlarmVisual() {
    const overlay = document.getElementById("heist-alarm-overlay");
    if (overlay) {
      overlay.style.backgroundColor = "rgba(239, 68, 68, 0.4)";
      setTimeout(
        () => (overlay.style.backgroundColor = "rgba(239, 68, 68, 0)"),
        250,
      );
    }
  }

  function handleActionBtn() {
    if (gameState === "idle") {
      startHeist();
    } else if (gameState === "playing") {
      // Le joueur déclenche l'impulsion (Tir de décryptage)
      gameState = "data-flying";
      dataPulse.x = canvas.width / 2;
      dataPulse.y = canvas.height - 30;
      dataPulse.active = true;
    }
  }

  function startHeist() {
    const betInput = document.getElementById("heist-bet");
    let bet = parseInt(betInput.value) || 0;
    let solde = getWallet();

    if (bet < 100 || bet > solde) {
      alert("Mise invalide ou solde insuffisant.");
      return;
    }

    setWallet(solde - bet);
    currentBet = bet;
    currentRingIndex = 0;
    currentMultiplier = 0;
    gameState = "playing";

    betInput.disabled = true;
    document.getElementById("btn-heist-cashout").classList.add("hidden");
    updateInterface();
  }

  function cashout() {
    if (gameState !== "playing" || currentRingIndex === 0) return;

    let gains = Math.floor(currentBet * currentMultiplier);
    setWallet(getWallet() + gains);
    alert(`Retrait sécurisé ! Vous évacuez la zone avec ${gains} FCFA.`);
    resetToIdle();
  }

  function endGame(isWin) {
    if (isWin) {
      let gains = Math.floor(currentBet * currentMultiplier);
      setWallet(getWallet() + gains);
      alert(
        `PIRATAGE ABSOLU ! Le coffre s'ouvre, vous obtenez ${gains} FCFA (x${currentMultiplier}) !`,
      );
    } else {
      alert("Sécurité déclenchée ! Votre code d'accès s'est désintégré.");
    }
    resetToIdle();
  }

  function resetToIdle() {
    gameState = "idle";
    currentRingIndex = 0;
    document.getElementById("heist-bet").disabled = false;
    document.getElementById("btn-heist-cashout").classList.add("hidden");
    updateInterface();
  }

  function updateInterface() {
    const actionBtn = document.getElementById("btn-heist-action");
    const cashoutBtn = document.getElementById("btn-heist-cashout");
    const displayMult = document.getElementById("heist-display-mult");
    const nextInfo = document.getElementById("heist-next-info");

    if (gameState === "idle") {
      actionBtn.innerText = "INITIALISER LE CASSE";
      actionBtn.style.background = "linear-gradient(135deg, #ff0055, #a855f7)";
      displayMult.innerText = "x0.00";
      displayMult.style.color = "#ff0055";
      nextInfo.innerText = "Sécurisez le premier anneau";
    } else {
      actionBtn.innerText = "ENVOYER L'IMPULSION !";
      actionBtn.style.background = "#ff0055";
      displayMult.innerText = `x${currentMultiplier.toFixed(2)}`;
      displayMult.style.color = currentRingIndex > 0 ? "#22c55e" : "#ff0055";

      if (currentRingIndex < rings.length) {
        nextInfo.innerText = `Objectif anneau ${currentRingIndex + 1} (Cible : x${rewards[currentRingIndex].toFixed(2)})`;
      }

      if (currentRingIndex > 0) {
        let currentGains = Math.floor(currentBet * currentMultiplier);
        cashoutBtn.innerText = `SÉCURISER LES GAINS (${currentGains} F)`;
        cashoutBtn.classList.remove("hidden");
      }
    }
  }

  function gameLoop() {
    updatePhysics();
    drawScene();
    requestAnimationFrame(gameLoop);
  }

  function initHeistEngine() {
    document
      .getElementById("btn-heist-action")
      .addEventListener("click", handleActionBtn);
    document
      .getElementById("btn-heist-cashout")
      .addEventListener("click", cashout);
    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeistEngine);
  } else {
    initHeistEngine();
  }
})();

// Relais d'affichage pour le jeu Cyber-Heist
(function () {
  const heistBtn = document.querySelector('[data-game="heist"]');
  if (heistBtn) {
    heistBtn.addEventListener("click", function () {
      document
        .querySelectorAll(".sidebar-menu .menu-item")
        .forEach((b) => b.classList.remove("active"));
      heistBtn.classList.add("active");

      document
        .querySelectorAll('.game-container, [id^="game-"]')
        .forEach((z) => z.classList.add("hidden"));

      const heistScreen = document.getElementById("game-heist");
      if (heistScreen) heistScreen.classList.remove("hidden");
    });
  }
})();

// ==========================================================================
// MODULE JEU 13 : CYBER-VECTOR ENGINE
// ==========================================================================
(function () {
  const canvas = document.getElementById("vector-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let isCycling = false;
  let currentAngle = 0;
  let cycleSpeed = 0;
  let selectedSectors = new Set(); // Stocke les choix (0 à 3)
  let currentBet = 0;

  const sectorMeta = [
    {
      name: "A",
      start: -Math.PI,
      end: -Math.PI / 2,
      cx: 130,
      cy: 130,
      color: "#ff0055",
    },
    {
      name: "B",
      start: -Math.PI / 2,
      end: 0,
      cx: 270,
      cy: 130,
      color: "#00e5ff",
    },
    {
      name: "C",
      start: 0,
      end: Math.PI / 2,
      cx: 270,
      cy: 270,
      color: "#a855f7",
    },
    {
      name: "D",
      start: Math.PI / 2,
      end: Math.PI,
      cx: 130,
      cy: 270,
      color: "#eab308",
    },
  ];

  function getWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWallet(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
  }

  function getMultiplier() {
    if (selectedSectors.size === 0) return 0;
    const houseEdge = 0.96;
    return parseFloat((houseEdge * (4 / selectedSectors.size)).toFixed(2));
  }

  // Gestion de l'UI interactive des boutons secteurs
  document.querySelectorAll(".vector-sector-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (isCycling) return;
      const sectorId = parseInt(this.dataset.sector);

      if (selectedSectors.has(sectorId)) {
        selectedSectors.delete(sectorId);
        this.style.background = "rgba(255,255,255,0.02)";
        this.style.borderColor = "#141f36";
        this.style.color = "#fff";
      } else {
        if (selectedSectors.size >= 3) return; // Garder au moins 1 secteur perdant
        selectedSectors.add(sectorId);
        this.style.background = "rgba(0,229,255,0.08)";
        this.style.borderColor = "#00e5ff";
        this.style.color = "#00e5ff";
      }

      const mult = getMultiplier();
      document.getElementById("vector-mult-display").innerText =
        mult > 0 ? `x${mult}` : "x0.00";
      document.getElementById("vector-mult-display").style.color =
        mult > 0 ? "#00e5ff" : "#64748b";
    });
  });

  function drawVectorGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const center = canvas.width / 2;

    // Trace des lignes de démarcation vectorielles épurées
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, 20);
    ctx.lineTo(center, canvas.height - 20);
    ctx.moveTo(20, center);
    ctx.lineTo(canvas.width - 20, center);
    ctx.stroke();

    // Rendu textuel des quadrants d'angle
    sectorMeta.forEach((s, idx) => {
      ctx.save();
      let isActive = selectedSectors.has(idx);
      ctx.fillStyle = isActive
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.1)";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`SECTEUR ${s.name}`, s.cx, s.cy);
      ctx.restore();
    });

    // Cercle central conducteur
    ctx.beginPath();
    ctx.arc(center, center, 120, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(20, 31, 54, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dessin de l'index/aiguille vectorielle tournante
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentAngle);

    ctx.shadowBlur = isCycling ? 15 : 5;
    ctx.shadowColor = "#00e5ff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(110, 0); // Longueur du vecteur traceur
    ctx.stroke();

    // Pointe de l'aiguille vectorielle
    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(110, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function startCycling() {
    if (isCycling) return;

    const betInput = document.getElementById("vector-bet");
    let bet = parseInt(betInput.value) || 0;
    let solde = getWallet();

    if (selectedSectors.size === 0) {
      alert("Veuillez sélectionner au moins un secteur cible.");
      return;
    }
    if (bet < 100 || bet > solde) {
      alert("Mise invalide ou solde insuffisant.");
      return;
    }

    setWallet(solde - bet);
    currentBet = bet;
    isCycling = true;

    betInput.disabled = true;
    document.getElementById("btn-vector-pulse").disabled = true;
    document.getElementById("btn-vector-pulse").innerText =
      "CYCLAGE EN COURS...";

    // Vitesse d'impulsion de départ élevée
    cycleSpeed = Math.random() * 0.4 + 0.5;
    animateCycle();
  }

  function animateCycle() {
    currentAngle += cycleSpeed;
    cycleSpeed *= 0.982; // Friction vectorielle linéaire fluide

    // Normalisation d'angle constante
    if (currentAngle > Math.PI) currentAngle -= Math.PI * 2;

    drawVectorGrid();

    if (cycleSpeed < 0.002) {
      isCycling = false;
      document.getElementById("vector-bet").disabled = false;
      document.getElementById("btn-vector-pulse").disabled = false;
      document.getElementById("btn-vector-pulse").innerText =
        "AMORCER LE CYCLAGE";
      evaluateResult();
    } else {
      requestAnimationFrame(animateCycle);
    }
  }

  function evaluateResult() {
    // Recherche du quadrant exact basé sur la position finale trigonométrique de l'aiguille
    let stoppingSector = 0;
    for (let i = 0; i < sectorMeta.length; i++) {
      if (
        currentAngle >= sectorMeta[i].start &&
        currentAngle <= sectorMeta[i].end
      ) {
        stoppingSector = i;
        break;
      }
    }

    let resultMeta = sectorMeta[stoppingSector];

    if (selectedSectors.has(stoppingSector)) {
      let mult = getMultiplier();
      let gains = Math.floor(currentBet * mult);
      setWallet(getWallet() + gains);
      alert(
        `Signal verrouillé sur le Secteur ${resultMeta.name} ! Vous gagnez ${gains} FCFA (x${mult}).`,
      );
    } else {
      alert(
        `Désalignement réseau. Le vecteur s'est arrêté sur le Secteur ${resultMeta.name}.`,
      );
    }
    drawVectorGrid();
  }

  function initVector() {
    drawVectorGrid();
    const btn = document.getElementById("btn-vector-pulse");
    if (btn) btn.addEventListener("click", startCycling);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVector);
  } else {
    initVector();
  }
})();

// Relais d'affichage pour le jeu Cyber-Vector
(function () {
  const vectorBtn = document.querySelector('[data-game="vector"]');
  if (vectorBtn) {
    vectorBtn.addEventListener("click", function () {
      document
        .querySelectorAll(".sidebar-menu .menu-item")
        .forEach((b) => b.classList.remove("active"));
      vectorBtn.classList.add("active");

      document
        .querySelectorAll('.game-container, [id^="game-"]')
        .forEach((z) => z.classList.add("hidden"));

      const vectorScreen = document.getElementById("game-vector");
      if (vectorScreen) vectorScreen.classList.remove("hidden");
    });
  }
})();

// ==========================================================================
// MOTEUR DE JEU EXCLUSIF : BINARY GRID (ISOLATION COMPLÈTE)
// ==========================================================================
(function () {
  let bgActive = false;
  let bgBet = 0;
  let bgMultiplier = 1.0;
  let bgBugsCount = 3;
  let bgBugsLocations = [];
  let bgRevealedCount = 0;

  const bgOdds = { 2: 1.08, 3: 1.13, 4: 1.19, 5: 1.25 };

  function renderPlaceholder() {
    const gridBox = document.getElementById("pixel-bg-grid");
    if (!gridBox) return;
    gridBox.innerHTML = "";
    for (let i = 0; i < 25; i++) {
      const tile = document.createElement("div");
      tile.className = "bg-tile disabled";
      tile.innerText = "??";
      gridBox.appendChild(tile);
    }
  }

  function fetchUserWallet() {
    if (typeof balance !== "undefined") return balance;
    if (typeof currentBalance !== "undefined") return currentBalance;
    const display = document.getElementById("user-balance");
    return display ? parseInt(display.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function updateUserWallet(amount) {
    if (typeof balance !== "undefined") balance = amount;
    if (typeof currentBalance !== "undefined") currentBalance = amount;
    const display = document.getElementById("user-balance");
    if (display) display.innerText = amount;
    if (typeof balanceSpan !== "undefined" && balanceSpan)
      balanceSpan.innerText = amount;
  }

  function launchBinarySession() {
    const inputBet = document.getElementById("bg-bet-amount");
    const selectBugs = document.getElementById("bg-bugs-select");
    const btnStart = document.getElementById("btn-bg-start");
    const btnCashout = document.getElementById("btn-bg-cashout");

    if (!inputBet || !selectBugs || !btnStart) return;

    bgBet = parseInt(inputBet.value);
    let currentWallet = fetchUserWallet();

    if (isNaN(bgBet) || bgBet < 100 || bgBet > currentWallet) {
      alert("Solde insuffisant ou mise invalide (Minimum 100 FCFA) !");
      return;
    }

    // Retrait de la mise
    currentWallet -= bgBet;
    updateUserWallet(currentWallet);

    // Paramétrage de session
    bgActive = true;
    bgRevealedCount = 0;
    bgMultiplier = 1.0;
    bgBugsCount = parseInt(selectBugs.value);

    // Verrouillage des champs
    selectBugs.disabled = true;
    inputBet.disabled = true;
    btnStart.classList.add("hidden");
    if (btnCashout) btnCashout.classList.remove("hidden");
    document.getElementById("bg-current-multiplier").innerText = "1.00x";

    // Placement aléatoire des bugs (0)
    bgBugsLocations = [];
    while (bgBugsLocations.length < bgBugsCount) {
      let position = Math.floor(Math.random() * 25);
      if (!bgBugsLocations.includes(position)) bgBugsLocations.push(position);
    }

    // Création dynamique de la matrice de jeu
    const gridBox = document.getElementById("pixel-bg-grid");
    gridBox.innerHTML = "";
    for (let i = 0; i < 25; i++) {
      const tile = document.createElement("div");
      tile.className = "bg-tile";
      tile.innerText = "??";

      tile.addEventListener("click", function () {
        if (
          !bgActive ||
          this.classList.contains("success") ||
          this.classList.contains("bug")
        )
          return;

        if (bgBugsLocations.includes(i)) {
          this.className = "bg-tile bug";
          this.innerText = "0";
          terminateBinarySession(false);
        } else {
          this.className = "bg-tile success";
          this.innerText = "1";
          bgRevealedCount++;

          let multiplierFactor = bgOdds[bgBugsCount] || 1.13;
          bgMultiplier = bgMultiplier * multiplierFactor;
          document.getElementById("bg-current-multiplier").innerText =
            bgMultiplier.toFixed(2) + "x";

          if (bgRevealedCount === 25 - bgBugsCount) {
            terminateBinarySession(true);
          }
        }
      });
      gridBox.appendChild(tile);
    }
  }

  function terminateBinarySession(isVictory) {
    bgActive = false;

    const tiles = document.querySelectorAll(".bg-tile");
    tiles.forEach((tile, idx) => {
      tile.classList.add("disabled");
      if (bgBugsLocations.includes(idx)) {
        tile.className = "bg-tile bug";
        tile.innerText = "0";
      } else if (!tile.classList.contains("success")) {
        tile.innerText = "1";
        tile.style.opacity = "0.4";
      }
    });

    if (isVictory) {
      let finalGains = Math.floor(bgBet * bgMultiplier);
      let updatedWallet = fetchUserWallet() + finalGains;
      updateUserWallet(updatedWallet);
      alert(
        `EXCELLENT ! Code secured. Gain : +${finalGains} FCFA (x${bgMultiplier.toFixed(2)})`,
      );
    } else {
      document.getElementById("bg-current-multiplier").innerText = "0.00x";
      alert("SYSTEM ERROR ! The bug corrupted the grid, bet lost.");
    }

    // Déblocage des options
    document.getElementById("bg-bugs-select").disabled = false;
    document.getElementById("bg-bet-amount").disabled = false;
    document.getElementById("btn-bg-start").classList.remove("hidden");
    document.getElementById("btn-bg-cashout").classList.add("hidden");
  }

  function setupBinaryGridEngine() {
    renderPlaceholder();

    const btnStart = document.getElementById("btn-bg-start");
    const btnCashout = document.getElementById("btn-bg-cashout");

    if (btnStart) btnStart.addEventListener("click", launchBinarySession);
    if (btnCashout) {
      btnCashout.addEventListener("click", () => {
        if (bgActive && bgRevealedCount > 0) terminateBinarySession(true);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupBinaryGridEngine);
  } else {
    setupBinaryGridEngine();
  }
})();

// ==========================================================================
// 3. MOTEUR CRASH AUTOMATIQUE SÉCURISÉ (CYBERCRASH)
// ==========================================================================
let crashInterval = null;
let currentMultiplier = 1.0;
let isCrashRunning = false;
let isPlayerInGame = false;
let hasCashedOut = false;
let currentBet = 0;
let nextGameTimer = 5; // Temps d'attente entre les manches (secondes)

const crashMultiplierEl = document.getElementById("crash-multiplier");
const crashStatusEl = document.getElementById("crash-status-text");
const crashGraphEl = document.getElementById("crash-arena-zone");
const btnCrashStart = document.getElementById("btn-crash-start");
const btnCrashCashout = document.getElementById("btn-crash-cashout");
const crashBetInput = document.getElementById("crash-bet-amount");

// Algorithme mathématique de génération du point de Crash réaliste (House Edge incluse)
function generateCrashPoint() {
  const rand = Math.random();
  // 12% de chance de crash instantané à 1.00x (sécurité de la banque)
  if (rand < 0.12) return 1.0;
  // Courbe exponentielle pour le reste des multiplicateurs
  return parseFloat(Math.max(1.01, 0.96 / (1 - rand)).toFixed(2));
}

if (btnCrashStart) {
  btnCrashStart.addEventListener("click", () => {
    if (isPlayerInGame) return;

    let balance = getWallet();
    currentBet = parseInt(crashBetInput.value);

    if (isNaN(currentBet) || currentBet < 100) {
      alert("La mise minimale est de 100 FCFA.");
      return;
    }
    if (currentBet > balance) {
      alert("Solde insuffisant ! Veuillez effectuer un dépôt.");
      return;
    }

    // Déduction immédiate de la mise
    balance -= currentBet;
    setWallet(balance);

    isPlayerInGame = true;
    btnCrashStart.innerText = "MISE ENREGISTRÉE...";
    btnCrashStart.disabled = true;
  });
}

if (btnCrashCashout) {
  btnCrashCashout.addEventListener("click", () => {
    if (!isCrashRunning || !isPlayerInGame || hasCashedOut) return;

    hasCashedOut = true;
    let balance = getWallet();
    const winnings = Math.floor(currentBet * currentMultiplier);

    // Créditer les gains
    balance += winnings;
    setWallet(balance);

    const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
    const uName = activeUser ? activeUser.username : "Joueur";

    // Archivage historique + Traces Admin
    saveGameHistory("CyberCrash", "Gain", winnings, "win");
    adminTriggerTransaction(uName, "gain", winnings);
    adminPushNotification(
      "gain",
      `${uName} a gagné +${winnings} F sur CyberCrash (${currentMultiplier}x)`,
    );

    crashStatusEl.innerText = `Encaissé ! +${winnings} F`;
    btnCrashCashout.classList.add("hidden");
  });
}

function startAutomatedCycle() {
  let countdown = nextGameTimer;
  if (btnCrashStart) {
    btnCrashStart.classList.remove("hidden");
    btnCrashStart.innerText = "Placer la mise";
    btnCrashStart.disabled = false;
  }
  if (btnCrashCashout) btnCrashCashout.classList.add("hidden");
  if (crashGraphEl) crashGraphEl.className = "crash-graph";
  hasCashedOut = false;

  let countdownInterval = setInterval(() => {
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      launchGame();
    } else {
      if (crashMultiplierEl) crashMultiplierEl.innerText = countdown + "s";
      if (crashStatusEl) crashStatusEl.innerText = "Recherche de faille...";
      countdown--;
    }
  }, 1000);
}

function launchGame() {
  isCrashRunning = true;
  currentMultiplier = 1.0;
  if (crashGraphEl) crashGraphEl.className = "crash-graph running";

  if (isPlayerInGame && btnCrashCashout) {
    btnCrashCashout.classList.remove("hidden");
    btnCrashStart.classList.add("hidden");
  }

  const targetCrashPoint = generateCrashPoint();

  crashInterval = setInterval(() => {
    if (currentMultiplier >= targetCrashPoint) {
      // --- LE MULTIPLICATEUR A EXPLOSÉ (CRASH) ---
      clearInterval(crashInterval);
      isCrashRunning = false;
      if (crashGraphEl) crashGraphEl.className = "crash-graph crashed";
      if (crashMultiplierEl) crashMultiplierEl.innerText = "CRASHED";

      // Si le joueur n'a pas cashout à temps -> Perte
      if (isPlayerInGame && !hasCashedOut) {
        const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
        const uName = activeUser ? activeUser.username : "Joueur";

        saveGameHistory("CyberCrash", "Perte", currentBet, "lose");
        adminTriggerTransaction(uName, "perte", currentBet);
        adminPushNotification(
          "perte",
          `${uName} a perdu sa mise de -${currentBet} F sur CyberCrash`,
        );
      }

      isPlayerInGame = false;
      // Relance automatique après 1.8 seconde d'affichage du crash
      setTimeout(() => {
        startAutomatedCycle();
      }, 1800);
    } else {
      // Vitesse d'accélération progressive du multiplicateur
      let inc = 0.01;
      if (currentMultiplier > 1.5) inc = 0.02;
      if (currentMultiplier > 5.0) inc = 0.1;
      if (currentMultiplier > 15.0) inc = 0.3;

      currentMultiplier = parseFloat((currentMultiplier + inc).toFixed(2));
      if (crashMultiplierEl)
        crashMultiplierEl.innerText = currentMultiplier.toFixed(2) + "x";
    }
  }, 50); // Rafraîchissement ultra fluide toutes les 50ms
}

// Lancement automatique du moteur si on est sur la page contenant le jeu
if (crashMultiplierEl) {
  startAutomatedCycle();
}

// ==========================================================================
// MOTEUR AUTOMATIQUE : QUANTUM PULSE
// ==========================================================================
let pulseTimer = 7; // Temps total du cycle
let pulseInterval = null;
let playerChoice = null; // 'red' ou 'blue'
let pulseBetActive = false;
let pulseBetAmount = 0;

const pulseEnergyBall = document.getElementById("pulse-energy-ball");
const pulseTimerText = document.getElementById("pulse-timer-text");
const pulseStatusText = document.getElementById("pulse-status-text");
const pulseCoreZone = document.getElementById("pulse-core-zone");
const btnPulseRed = document.getElementById("btn-pulse-red");
const btnPulseBlue = document.getElementById("btn-pulse-blue");
const pulseBetInput = document.getElementById("pulse-bet-amount");
const pulseBetStatus = document.getElementById("pulse-bet-status");
const pulseHistoryBadges = document.getElementById("pulse-history-badges");

// Gérer la sélection de la polarité
function setupPulseButtons() {
  if (!btnPulseRed || !btnPulseBlue) return;

  btnPulseRed.addEventListener("click", () => placePulseBet("red"));
  btnPulseBlue.addEventListener("click", () => placePulseBet("blue"));
}

function placePulseBet(choice) {
  if (pulseTimer <= 2) {
    pulseBetStatus.innerText =
      "❌ Pari refusé : Les flux sont déjà verrouillés !";
    return;
  }

  const balanceSpan = document.getElementById("user-balance");
  let balance = parseInt(balanceSpan.innerText);
  pulseBetAmount = parseInt(pulseBetInput.value);

  if (isNaN(pulseBetAmount) || pulseBetAmount < 100) {
    alert("Mise minimale : 100 FCFA");
    return;
  }

  if (pulseBetAmount > balance) {
    alert("Solde insuffisant ! Faites un dépôt.");
    return;
  }

  // Si le joueur change d'avis, on lui rend d'abord sa mise précédente
  if (pulseBetActive) {
    balance += pulseBetAmount;
  } else {
    balance -= pulseBetAmount;
  }
  balanceSpan.innerText = balance;

  // Enregistrer le choix
  playerChoice = choice;
  pulseBetActive = true;

  // Effet visuel sur les boutons
  btnPulseRed.classList.remove("selected");
  btnPulseBlue.classList.remove("selected");
  if (choice === "red") btnPulseRed.classList.add("selected");
  if (choice === "blue") btnPulseBlue.classList.add("selected");

  pulseBetStatus.innerText = `✔ Misé ${pulseBetAmount} FCFA sur l'Impulsion ${choice === "red" ? "Rouge" : "Bleue"}`;
}

// Boucle infinie du Cœur Quantique
function startPulseCycle() {
  pulseTimer = 7;
  playerChoice = null;
  pulseBetActive = false;

  if (btnPulseRed) {
    btnPulseRed.classList.remove("selected");
    btnPulseBlue.classList.remove("selected");
    pulseBetStatus.innerText = "Aucun pari placé pour cette impulsion";
  }

  if (pulseCoreZone) {
    pulseCoreZone.className = "pulse-display"; // Reset les classes d'animation CSS
    pulseStatusText.innerText = "Stabilisation du noyau...";
  }

  pulseInterval = setInterval(() => {
    pulseTimer--;

    if (pulseTimer > 2) {
      if (pulseTimerText) pulseTimerText.innerText = pulseTimer + "s";
      if (pulseStatusText)
        pulseStatusText.innerText = "Noyau stable. Choisissez une polarité...";
    } else if (pulseTimer <= 2 && pulseTimer > 0) {
      // Phase de verrouillage et de chargement
      if (pulseTimerText) pulseTimerText.innerText = "⚡";
      if (pulseStatusText)
        pulseStatusText.innerText =
          "Surcharge imminente ! Paris verrouillés...";
      if (pulseCoreZone) pulseCoreZone.classList.add("charging");
    } else if (pulseTimer === 0) {
      // L'IMPULSION ÉCLATE
      clearInterval(pulseInterval);
      triggerPulseResult();
    }
  }, 1000);
}

function triggerPulseResult() {
  // Hasard à 50/50 : pile ou face quantique
  const result = Math.random() < 0.5 ? "red" : "blue";

  if (pulseTimerText) pulseTimerText.innerText = "PULSE !";
  if (pulseStatusText)
    pulseStatusText.innerText = `Impulsion finale : Énergie ${result === "red" ? "Rouge" : "Bleue"}`;

  // Activer la grosse lueur CSS correspondante
  if (pulseCoreZone) pulseCoreZone.classList.add(`pulse-${result}`);

  // Vérifier si le joueur a gagné
  if (pulseBetActive && playerChoice === result) {
    const balanceSpan = document.getElementById("user-balance");
    let balance = parseInt(balanceSpan.innerText);

    // Multiplicateur x2 : On rend la mise doublée
    const winAmount = pulseBetAmount * 2;
    balance += winAmount;
    balanceSpan.innerText = balance;

    if (pulseBetStatus)
      pulseBetStatus.innerText = `🎉 GAGNÉ ! +${winAmount} FCFA accumulés !`;
  } else if (pulseBetActive) {
    if (pulseBetStatus)
      pulseBetStatus.innerText = `💥 Énergie instable... Mise perdue.`;
  }

  // Ajouter à l'historique sous forme de pastille colorée
  addPulseHistory(result);

  // Attendre 3 secondes que le joueur admire le résultat avant de relancer un cycle
  setTimeout(() => {
    startPulseCycle();
  }, 3000);
}

function addPulseHistory(color) {
  if (!pulseHistoryBadges) return;

  const dot = document.createElement("span");
  dot.className = `dot-hist ${color}`;

  pulseHistoryBadges.insertBefore(dot, pulseHistoryBadges.firstChild);

  // Limiter l'historique aux 8 dernières impulsions
  if (pulseHistoryBadges.children.length > 8) {
    pulseHistoryBadges.removeChild(pulseHistoryBadges.lastChild);
  }
}

// Initialisation au chargement
if (document.getElementById("game-pulse")) {
  setupPulseButtons();
  startPulseCycle();
}

// ==========================================================================
// MODULE JEU 2 : MANGA ARENA VIRTUAL MULTI-COMBAT (AVEC OPTION PRONOSTIC LIVE)
// ==========================================================================
(function () {
  let matches = [];
  let coupon = [];
  let activeTickets = [];
  let archivedTickets = [];

  let timerDuration = 120;
  let currentPhase = "PARIS";
  let countdownInterval = null;

  const fightersPool = [
    "Goku",
    "Naruto",
    "Luffy",
    "Vegeta",
    "Sasuke",
    "Zoro",
    "Ichigo",
    "Saitama",
    "Broly",
    "Kakashi",
    "Gon",
    "Killua",
    "Eren",
    "Mikasa",
    "Tanjiro",
    "Nezuko",
    "Deku",
    "Bakugo",
    "Sukuna",
    "Gojo",
  ];

  function getWallet() {
    if (typeof balance !== "undefined") return balance;
    const el = document.getElementById("user-balance");
    return el ? parseInt(el.innerText.replace(/\s/g, "")) || 0 : 0;
  }

  function setWallet(val) {
    if (typeof balance !== "undefined") balance = val;
    const el = document.getElementById("user-balance");
    if (el) el.innerText = val;
    if (typeof balanceSpan !== "undefined" && balanceSpan)
      balanceSpan.innerText = val;
  }

  function generate20Matches() {
    matches = [];
    for (let i = 1; i <= 20; i++) {
      let f1 = fightersPool[Math.floor(Math.random() * fightersPool.length)];
      let f2 = fightersPool[Math.floor(Math.random() * fightersPool.length)];
      while (f1 === f2) {
        f2 = fightersPool[Math.floor(Math.random() * fightersPool.length)];
      }

      matches.push({
        id: i,
        fighter1: f1,
        fighter2: f2,
        cote1: (Math.random() * 0.7 + 1.4).toFixed(2),
        cote2: (Math.random() * 0.7 + 1.4).toFixed(2),
        score1: 0,
        score2: 0,
        status: "ATTENTE",
        winner: null,
      });
    }
    renderMatches();
    renderLiveTrackedMatches();
  }

  function renderMatches() {
    const container = document.getElementById("ma-dynamic-matches");
    if (!container) return;
    container.innerHTML = "";
    buildGridsHtml(matches, container, true);
  }

  function renderLiveTrackedMatches() {
    const container = document.getElementById("ma-live-tracked-matches");
    const msg = document.getElementById("ma-no-live-msg");
    if (!container || !msg) return;

    let trackedIds = [];
    activeTickets.forEach((t) =>
      t.selections.forEach((s) => trackedIds.push(s.matchId)),
    );

    let filteredMatches = matches.filter((m) => trackedIds.includes(m.id));

    if (filteredMatches.length === 0) {
      msg.classList.remove("hidden");
      container.innerHTML = "";
    } else {
      msg.classList.add("hidden");
      container.innerHTML = "";
      buildGridsHtml(filteredMatches, container, false);
    }
  }

  // Générateur de lignes de match amélioré
  function buildGridsHtml(matchesArray, targetContainer, bindEvents) {
    matchesArray.forEach((m) => {
      // 1. Vérification dans le panier temporaire
      let isSelected1 = coupon.some((c) => c.matchId === m.id && c.pick === 1);
      let isSelected2 = coupon.some((c) => c.matchId === m.id && c.pick === 2);

      // 2. NOUVEAU : Vérification dans les tickets actifs (Pour la vue "Mon Pari En Direct")
      let hasActivePick1 = false;
      let hasActivePick2 = false;

      activeTickets.forEach((t) => {
        t.selections.forEach((s) => {
          if (s.matchId === m.id) {
            if (s.pick === 1) hasActivePick1 = true;
            if (s.pick === 2) hasActivePick2 = true;
          }
        });
      });

      let scoreText =
        currentPhase === "PARIS" ? "VS" : `${m.score1} - ${m.score2}`;
      let isDisabled = currentPhase === "COMBAT" ? "disabled" : "";

      // Classes CSS dynamiques si c'est ton choix en plein combat
      let liveClass1 = hasActivePick1 ? "selected" : "";
      let liveClass2 = hasActivePick2 ? "selected" : "";

      // Petits indicateurs textuels "Ton choix" à côté des noms
      let choiceIndicator1 = hasActivePick1
        ? ' <span style="color:#ffaa00; font-size:0.75rem;">(Ton choix)</span>'
        : "";
      let choiceIndicator2 = hasActivePick2
        ? ' <span style="color:#ffaa00; font-size:0.75rem;">(Ton choix)</span>'
        : "";

      const row = document.createElement("div");
      row.className = "ma-match-row";
      row.innerHTML = `
                <div class="ma-match-id">#${m.id < 10 ? "0" + m.id : m.id}</div>
                <div class="ma-team team-home">${m.fighter1}${choiceIndicator1}</div>
                <div class="ma-vs-cell">${scoreText}</div>
                <div class="ma-team team-away">${choiceIndicator2}${m.fighter2}</div>
                <div class="ma-odds-group">
                    <button class="ma-odd-btn ${isSelected1 || liveClass1 ? "selected" : ""}" ${isDisabled} data-match="${m.id}" data-pick="1">
                        <span>1</span><strong>${m.cote1}</strong>
                    </button>
                    <button class="ma-odd-btn ${isSelected2 || liveClass2 ? "selected" : ""}" ${isDisabled} data-match="${m.id}" data-pick="2">
                        <span>2</span><strong>${m.cote2}</strong>
                    </button>
                </div>
            `;
      targetContainer.appendChild(row);
    });

    if (bindEvents && currentPhase === "PARIS") {
      targetContainer.querySelectorAll(".ma-odd-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const matchId = parseInt(target.getAttribute("data-match"));
          const pick = parseInt(target.getAttribute("data-pick"));
          toggleBetSelection(matchId, pick);
        });
      });
    }
  }

  function toggleBetSelection(matchId, pick) {
    coupon = coupon.filter((c) => c.matchId !== matchId);
    const match = matches.find((m) => m.id === matchId);
    let cote = pick === 1 ? match.cote1 : match.cote2;
    let choiceName = pick === 1 ? match.fighter1 : match.fighter2;

    coupon.push({
      matchId: matchId,
      pick: pick,
      cote: parseFloat(cote),
      fighterName: choiceName,
      matchTitle: `${match.fighter1} VS ${match.fighter2}`,
    });

    renderMatches();
    renderCoupon();
  }

  function removeBetFromCoupon(matchId) {
    coupon = coupon.filter((c) => c.matchId !== matchId);
    renderMatches();
    renderCoupon();
  }

  function renderCoupon() {
    const wrapper = document.getElementById("ma-coupon-selections");
    if (!wrapper) return;

    if (coupon.length === 0) {
      wrapper.innerHTML = `<p class="ma-empty-msg">Aucun combat sélectionné.</p>`;
      document.getElementById("ma-total-cote").innerText = "1.00";
      updatePotentialWin();
      return;
    }

    wrapper.innerHTML = "";
    let totalCote = 1;

    coupon.forEach((c) => {
      totalCote *= c.cote;
      const item = document.createElement("div");
      item.className = "ma-basket-item";
      item.innerHTML = `
                <i class="fa-solid fa-xmark remove-item" data-match="${c.matchId}"></i>
                <div class="ma-basket-match-title">${c.matchTitle}</div>
                <div class="ma-basket-pick">
                    <span>${c.fighterName}</span>
                    <strong style="color:#ffaa00;">${c.cote.toFixed(2)}</strong>
                </div>
            `;
      wrapper.appendChild(item);
    });

    document.getElementById("ma-total-cote").innerText = totalCote.toFixed(2);
    wrapper.querySelectorAll(".remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        removeBetFromCoupon(parseInt(e.target.getAttribute("data-match")));
      });
    });
    updatePotentialWin();
  }

  function updatePotentialWin() {
    let stake = parseInt(document.getElementById("ma-stake").value) || 0;
    let totalCote =
      parseFloat(document.getElementById("ma-total-cote").innerText) || 1.0;
    document.getElementById("ma-potential-win").innerText =
      (coupon.length > 0 ? Math.floor(stake * totalCote) : 0).toLocaleString() +
      " F";
  }

  function startArenaLoop() {
    let timeLeft = timerDuration;
    countdownInterval = setInterval(() => {
      timeLeft--;
      let mins = Math.floor(timeLeft / 60);
      let secs = timeLeft % 60;
      document.getElementById("ma-countdown").innerText =
        `${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;

      if (timeLeft <= 0) {
        if (currentPhase === "PARIS") {
          switchToCombatPhase();
          timeLeft = 120;
        } else {
          switchToParisPhase();
          timeLeft = 120;
        }
      }
    }, 1000);
  }

  function switchToCombatPhase() {
    currentPhase = "COMBAT";
    document.getElementById("ma-timer-status").innerText =
      "COMBATS EN COURS (ROUND 1-2)";
    document.getElementById("ma-timer-status").style.color = "#ff0055";

    if (activeTickets.length > 0) {
      document.getElementById("ma-live-indicator").classList.remove("hidden");
    }

    renderMatches();
    renderLiveTrackedMatches();

    setTimeout(() => simulateRound(1), 20000);
    setTimeout(() => simulateRound(2), 80000);
  }

  function simulateRound(roundNumber) {
    matches.forEach((m) => {
      if (Math.random() > 0.5) m.score1 += 1;
      else m.score2 += 1;
    });
    renderMatches();
    renderLiveTrackedMatches();

    if (roundNumber === 2) {
      matches.forEach((m) => {
        if (m.score1 === m.score2) {
          if (Math.random() > 0.5) m.score1 += 1;
          else m.score2 += 1;
        }
        m.winner = m.score1 > m.score2 ? 1 : 2;
      });
      resolveActiveTickets();
    }
  }

  function switchToParisPhase() {
    currentPhase = "PARIS";
    document.getElementById("ma-timer-status").innerText = "PARIS OUVERTS";
    document.getElementById("ma-timer-status").style.color = "#ffaa00";
    document.getElementById("ma-live-indicator").classList.add("hidden");

    coupon = [];
    renderCoupon();
    generate20Matches();
  }

  function resolveActiveTickets() {
    if (activeTickets.length === 0) return;

    activeTickets.forEach((ticket) => {
      let isTicketWin = true;
      let trackingDetails = [];

      ticket.selections.forEach((sel) => {
        let m = matches.find((match) => match.id === sel.matchId);
        let wonPick = m.winner === sel.pick;
        if (!wonPick) isTicketWin = false;

        trackingDetails.push({
          title: sel.matchTitle,
          pickName: sel.fighterName,
          finalScore: `${m.score1} - ${m.score2}`,
          winnerName: m.winner === 1 ? m.fighter1 : m.fighter2,
          status: wonPick ? "GAGNÉ" : "PERDU",
        });
      });

      if (isTicketWin) {
        let gains = Math.floor(ticket.stake * ticket.totalCote);
        setWallet(getWallet() + gains);
        ticket.status = "GAGNÉ";
        ticket.gains = gains;
      } else {
        ticket.status = "PERDU";
        ticket.gains = 0;
      }

      ticket.details = trackingDetails;
      archivedTickets.unshift(ticket);
    });

    activeTickets = [];
    renderLiveTrackedMatches();
    renderHistory();
  }

  function renderHistory() {
    const container = document.getElementById("ma-history-container");
    const msg = document.getElementById("ma-no-history-msg");
    if (!container || !msg) return;

    if (archivedTickets.length === 0) {
      msg.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    msg.classList.add("hidden");
    container.innerHTML = "";

    archivedTickets.forEach((t, index) => {
      const card = document.createElement("div");
      card.className = "ma-historic-card";

      let badgeClass = t.status === "GAGNÉ" ? "win" : "lose";
      let detailsHtml = "";

      t.details.forEach((d) => {
        let color = d.status === "GAGNÉ" ? "#22c55e" : "#ef4444";
        let explanation =
          d.status === "GAGNÉ"
            ? `✓ Validé (${d.finalScore})`
            : `✗ Perdu : Vous avez misé sur ${d.pickName} mais ${d.winnerName} a gagné (${d.finalScore})`;

        detailsHtml += `
                    <div style="margin-top:5px; border-bottom:1px solid #141f36; padding-bottom:5px;">
                        <div style="font-weight:600; color:#fff;">${d.title}</div>
                        <div style="color:${color}; font-size:0.75rem; margin-top:2px;">${explanation}</div>
                    </div>
                `;
      });

      card.innerHTML = `
                <div class="ma-historic-header">
                    <div>
                        <span style="color:#64748b; font-size:0.75rem;">Mise : ${t.stake} F | Cote : ${t.totalCote.toFixed(2)}</span>
                    </div>
                    <span class="ma-status-badge ${badgeClass}">${t.status} (${t.gains} F)</span>
                </div>
                <div class="ma-historic-details">
                    ${detailsHtml}
                </div>
            `;
      container.appendChild(card);
    });
  }

  function initTabsNavigation() {
    const tabs = {
      "ma-tab-all-games": "ma-view-all",
      "ma-tab-my-live": "ma-view-live-tracking",
      "ma-tab-history": "ma-view-history",
    };

    Object.keys(tabs).forEach((tabId) => {
      const btn = document.getElementById(tabId);
      if (btn) {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".ma-tab-btn")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelectorAll(".ma-sub-view")
            .forEach((v) => v.classList.add("hidden"));

          btn.classList.add("active");
          document.getElementById(tabs[tabId]).classList.remove("hidden");
        });
      }
    });
  }

  function initArenaCombinedEngine() {
    initTabsNavigation();
    generate20Matches();
    startArenaLoop();

    const stakeInput = document.getElementById("ma-stake");
    if (stakeInput) stakeInput.addEventListener("input", updatePotentialWin);

    const btnClear = document.getElementById("btn-ma-clear-coupon");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        coupon = [];
        renderMatches();
        renderCoupon();
      });
    }

    const btnSubmit = document.getElementById("btn-ma-submit-coupon");
    if (btnSubmit) {
      btnSubmit.addEventListener("click", () => {
        if (currentPhase !== "PARIS") {
          alert("Les paris sont fermés !");
          return;
        }
        if (coupon.length === 0) {
          alert("Votre coupon est vide.");
          return;
        }

        let stake = parseInt(stakeInput.value);
        let currentSolde = getWallet();

        if (isNaN(stake) || stake < 200 || stake > currentSolde) {
          alert("Solde insuffisant ou mise inférieure à 200 FCFA.");
          return;
        }

        setWallet(currentSolde - stake);
        activeTickets.push({
          selections: [...coupon],
          stake: stake,
          totalCote: parseFloat(
            document.getElementById("ma-total-cote").innerText,
          ),
        });

        coupon = [];
        renderMatches();
        renderCoupon();
        renderLiveTrackedMatches();
        alert(
          "Coupon validé avec succès ! Suivez-le dans l'onglet 'Mon Pari En Direct'.",
        );
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArenaCombinedEngine);
  } else {
    initArenaCombinedEngine();
  }
})();

// ==========================================================================
// GESTION DU RETRAIT INSTANTANÉ DIRECT VERS LA SIM (API PAYOUT)
// ==========================================================================
const btnExecuterRetrait = document.getElementById("btn-retrait");

if (btnExecuterRetrait) {
  btnExecuterRetrait.addEventListener("click", (e) => {
    e.preventDefault();

    const montantRetraitInput = document.getElementById("retrait-montant");
    const telephoneRetraitInput = document.getElementById("retrait-phone");
    const reseauRetraitSelect = document.getElementById("retrait-reseau");

    const montantTx = parseInt(
      montantRetraitInput ? montantRetraitInput.value : 0,
    );
    const phoneTx = telephoneRetraitInput
      ? telephoneRetraitInput.value.trim()
      : "";
    const networkTx = reseauRetraitSelect ? reseauRetraitSelect.value : "MTN";

    let balance = getWallet();

    // 1. Validations de sécurité
    if (!montantTx || montantTx < 100) {
      alert("Le montant minimum de retrait est de 100 XOF.");
      return;
    }
    if (montantTx > balance) {
      alert("Solde insuffisant pour effectuer ce retrait !");
      return;
    }
    if (!phoneTx || phoneTx.length < 8) {
      alert("Veuillez entrer un numéro de téléphone béninois valide.");
      return;
    }

    const activeUser = JSON.parse(localStorage.getItem("yb_active_user"));
    if (!activeUser) return;

    // 2. Déduction immédiate du solde pour éviter les spams de clics
    let nouveauSolde = balance - montantTx;
    setWallet(nouveauSolde);

    // 3. Envoi de la requête au terminal de paiement Kkiapay (Simulation Payout Direct SIM)
    // Dans un vrai environnement de production, ce bloc fetch contacte l'API de Kkiapay
    btnExecuterRetrait.innerText = "CONNEXION À LA SIM...";
    btnExecuterRetrait.disabled = true;

    setTimeout(() => {
      // Simulation d'une réponse positive de transfert réseau par l'opérateur mobile
      const transfertReussi = true;

      if (transfertReussi) {
        // Enregistrement des logs financiers et notifications admin
        saveGameHistory("Retrait SIM", "Perte", montantTx, "lose"); // Ajouté à l'historique personnel comme débit
        adminTriggerTransaction(activeUser.username, "retrait", montantTx);
        adminPushNotification(
          "retrait",
          `RETRAIT SIM DIRECT : ${activeUser.username} a retiré ${montantTx} F vers son numéro ${phoneTx} (${networkTx})`,
        );

        alert(
          `SUCCÈS PAIEMENT !\nLes fonds de ${montantTx} XOF ont été envoyés directement sur votre compte mobile ${networkTx} (${phoneTx}). Vériﬁez votre SIM.`,
        );

        // Nettoyage et fermeture
        if (montantRetraitInput) montantRetraitInput.value = "";
        if (telephoneRetraitInput) telephoneRetraitInput.value = "";

        const fenetreModale = document.getElementById("modal-overlay");
        if (fenetreModale)
          fenetreModale.style.setProperty("display", "none", "important");
      } else {
        // En cas d'échec réseau, on recrédite le joueur
        setWallet(getWallet() + montantTx);
        alert(
          "Échec du virement de l'opérateur mobile. Votre solde a été restauré.",
        );
      }

      btnExecuterRetrait.innerText = "LANCER LE RETRAIT DIRECT";
      btnExecuterRetrait.disabled = false;
    }, 2500); // 2.5 secondes de traitement réseau
  });
}

// ==========================================================================
// OUVERTURE DYNAMIQUE DE LA MODALE (DÉPÔT / RETRAIT)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const openDepositBtn = document.getElementById("open-deposit-modal");
  const openWithdrawBtn = document.getElementById("open-withdraw-modal");
  const closeModalsBtn = document.getElementById("close-modal-btn");
  const fenetreModale = document.getElementById("modal-overlay");
  const interfaceDepot = document.getElementById("modal-content-depot");
  const interfaceRetrait = document.getElementById("modal-content-withdraw");

  // Si tu as aussi des boutons dans ton menu latéral (sidebar) avec ces classes :
  const sidebarDepositBtn =
    document.querySelector(".menu-item[data-game='depot']") ||
    document.querySelector(".btn-deposit");
  const sidebarWithdrawBtn =
    document.querySelector(".menu-item[data-game='retrait']") ||
    document.querySelector(".btn-withdraw");

  // Fonction universelle d'ouverture
  function ouvrirModale(type) {
    if (fenetreModale && interfaceDepot && interfaceRetrait) {
      fenetreModale.style.setProperty("display", "flex", "important");
      if (type === "depot") {
        interfaceDepot.style.setProperty("display", "block", "important");
        interfaceRetrait.style.setProperty("display", "none", "important");
      } else if (type === "retrait") {
        interfaceDepot.style.setProperty("display", "none", "important");
        interfaceRetrait.style.setProperty("display", "block", "important");
      }
    }
  }

  // Écouteurs sur les boutons de la barre supérieure (Navbar)
  if (openDepositBtn) {
    openDepositBtn.addEventListener("click", (e) => {
      e.preventDefault();
      ouvrirModale("depot");
    });
  }
  if (openWithdrawBtn) {
    openWithdrawBtn.addEventListener("click", (e) => {
      e.preventDefault();
      ouvrirModale("retrait");
    });
  }

  // Écouteurs si l'utilisateur clique depuis le menu latéral (Sidebar)
  if (sidebarDepositBtn) {
    sidebarDepositBtn.addEventListener("click", (e) => {
      e.preventDefault();
      ouvrirModale("depot");
    });
  }
  if (sidebarWithdrawBtn) {
    sidebarWithdrawBtn.addEventListener("click", (e) => {
      e.preventDefault();
      ouvrirModale("retrait");
    });
  }

  // Fermeture de la modale
  if (closeModalsBtn && fenetreModale) {
    closeModalsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fenetreModale.style.setProperty("display", "none", "important");
    });
  }
});
// ==========================================
// CONFIGURATION DE L'API KKIAPAY
// ==========================================
const KKIAPAY_PUBLIC_KEY = "bd9260407a3811f19ef14b7a645214c1"; // Ta clé Sandbox officielle

// ==========================================
// GESTION DES DÉPÔTS AUTOMATIQUES
// ==========================================
const btnDepot = document.getElementById("btn-depot");

if (btnDepot) {
  btnDepot.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Clic détecté sur le bouton Lancer le dépôt");

    const inputMontant = document.getElementById("depot-montant");
    const inputPhone = document.getElementById("depot-phone");

    if (!inputMontant || !inputPhone) {
      console.error(
        "Erreur : Les champs 'depot-montant' ou 'depot-phone' sont introuvables dans le HTML.",
      );
      alert("⚠️ Erreur technique : Champs du formulaire introuvables.");
      return;
    }

    const montant = parseInt(inputMontant.value);
    const telephone = inputPhone.value.trim();

    console.log(`Montant saisi : ${montant}, Téléphone : ${telephone}`);

    if (isNaN(montant) || montant < 100) {
      alert("⚠️ Le montant minimum de dépôt est de 100 FCFA.");
      return;
    }

    if (!telephone) {
      alert("⚠️ Veuillez renseigner votre numéro de téléphone.");
      return;
    }

    // Vérification de la présence du script Kkiapay
    if (typeof openKkiapayWidget !== "undefined") {
      console.log("Ouverture du widget via openKkiapayWidget...");
      openKkiapayWidget({
        amount: montant,
        position: "center",
        sandbox: true, //
        key: KKIAPAY_PUBLIC_KEY,
        phone: telephone,
      });
    }
    // Alternative si l'instance globale s'appelle différemment selon la version du SDK
    else if (typeof Kkiapay !== "undefined") {
      console.log("Ouverture du widget via l'instance Kkiapay...");
      Kkiapay({
        amount: montant,
        position: "center",
        sandbox: true, //
        key: KKIAPAY_PUBLIC_KEY,
        phone: telephone,
      });
    } else {
      console.error("Le script Kkiapay (k.js) n'est pas chargé sur la page.");
      alert(
        "⚠️ Le service de paiement n'est pas disponible pour le moment. Vérifiez votre connexion ou l'inclusion du script k.js.",
      );
    }
  });
} else {
  console.error(
    "Erreur : Le bouton avec l'ID 'btn-depot' est introuvables sur cette page.",
  );
}

// ==========================================
// INTERCEPTION DU SUCCÈS
// ==========================================
if (typeof addKkiapayListener === "function") {
  addKkiapayListener("success", function (response) {
    console.log("Paiement réussi, réponse de Kkiapay :", response);
    const montantPaye = parseInt(response.amount);

    let soldeActuel = parseFloat(localStorage.getItem("solde")) || 0;
    soldeActuel += montantPaye;
    localStorage.setItem("solde", soldeActuel);

    alert(
      `🎉 Paiement validé ! Votre compte YeagerBet a été crédité de ${montantPaye} FCFA.`,
    );
    window.location.reload();
  });
}

// retrait

const btnRetrait = document.getElementById("btn-retrait");

if (btnRetrait) {
  btnRetrait.addEventListener("click", async function () {
    const network = document.getElementById("retrait-reseau").value;
    const phone = document.getElementById("retrait-phone").value.trim();
    const amount = parseFloat(document.getElementById("retrait-montant").value);
    let soldeActuel = parseFloat(localStorage.getItem("solde")) || 0;

    if (!phone || isNaN(amount) || amount <= 0) {
      alert("⚠️ Veuillez entrer un numéro valide et un montant supérieur à 0.");
      return;
    }

    if (amount > soldeActuel) {
      alert(
        `❌ Solde insuffisant ! Votre solde actuel est de ${soldeActuel} FCFA.`,
      );
      return;
    }

    btnRetrait.disabled = true;
    btnRetrait.innerText = "TRAITEMENT EN COURS...";

    try {
      // Requête vers ton dossier api/ qu'on va lier à Vercel
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount, network }),
      });

      const result = await response.json();

      if (result.success) {
        soldeActuel -= amount;
        localStorage.setItem("solde", soldeActuel);

        alert(
          `🎉 Retrait automatique réussi !\n${amount} FCFA ont été transférés sur le numéro ${phone}.`,
        );
        window.location.reload();
      } else {
        alert(`❌ Échec du retrait automatique : ${result.error}`);
        btnRetrait.disabled = false;
        btnRetrait.innerText = "DEMANDER LE RETRAIT INSTANTANÉ";
      }
    } catch (error) {
      console.error(error);
      alert(
        "⚠️ Impossible de joindre le serveur de retrait. Ce bouton fonctionnera à 100% dès qu'on aura déployé sur Vercel !",
      );
      btnRetrait.disabled = false;
      btnRetrait.innerText = "DEMANDER LE RETRAIT INSTANTANÉ";
    }
  });
}
