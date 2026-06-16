(() => {
  "use strict";

  const STORAGE_KEY = "potion-pop-best-score-v1";
  const MAX_SCORE = 9999999;
  const STARTING_TIME = 75;
  const STARTING_LIVES = 5;
  const MAX_ACTIVE_ITEMS = 12;

  const ingredients = [
    { id: "moonberry", name: "Moonberry", icon: "🫐" },
    { id: "sunlemon", name: "Sun Lemon", icon: "🍋" },
    { id: "mintleaf", name: "Mint Leaf", icon: "🌿" },
    { id: "starsugar", name: "Star Sugar", icon: "⭐" },
    { id: "dragonchili", name: "Dragon Chili", icon: "🌶️" },
    { id: "glowshroom", name: "Glow Shroom", icon: "🍄" },
    { id: "cloudmilk", name: "Cloud Milk", icon: "🥛" },
    { id: "sparkcrystal", name: "Spark Crystal", icon: "💎" }
  ];

  const recipes = [
    { id: "twilight-fizz", name: "Twilight Fizz", icon: "🌙", ingredients: ["moonberry", "starsugar", "cloudmilk"], points: 160, color: "#a98cff" },
    { id: "sunbeam-soda", name: "Sunbeam Soda", icon: "☀️", ingredients: ["sunlemon", "mintleaf", "starsugar"], points: 150, color: "#ffd86f" },
    { id: "dragon-tonic", name: "Dragon Tonic", icon: "🐉", ingredients: ["dragonchili", "glowshroom", "cloudmilk"], points: 180, color: "#ff8b5f" },
    { id: "forest-foam", name: "Forest Foam", icon: "🌲", ingredients: ["mintleaf", "glowshroom", "moonberry"], points: 155, color: "#7de7c8" },
    { id: "crystal-cooler", name: "Crystal Cooler", icon: "🧊", ingredients: ["sparkcrystal", "cloudmilk", "sunlemon"], points: 170, color: "#8bd9ff" },
    { id: "lucky-bubble", name: "Lucky Bubble", icon: "🍀", ingredients: ["starsugar", "sparkcrystal", "mintleaf"], points: 175, color: "#7de7c8" },
    { id: "spicy-spark", name: "Spicy Spark", icon: "⚡", ingredients: ["dragonchili", "sparkcrystal", "starsugar"], points: 190, color: "#ff6fb1" },
    { id: "mushroom-mocha", name: "Mushroom Mocha", icon: "☕", ingredients: ["glowshroom", "cloudmilk", "moonberry"], points: 165, color: "#c99a6b" }
  ];

  const failMessages = [
    "That brew hiccuped, sneezed, and left the building.",
    "Oops. The cauldron says this is technically soup.",
    "Potion failed. Somewhere, a frog just filed a complaint.",
    "That combo made the bubbles unionize.",
    "Wrong mix! The potion turned into dramatic fog."
  ];

  const successMessages = [
    "Perfect pop! The bubbles are applauding.",
    "Recipe complete. Extremely legal magic.",
    "That potion has sparkle-per-second efficiency.",
    "Brew nailed. The cauldron is emotionally moved.",
    "Customer served! Tiny wizard economy restored."
  ];

  const state = {
    running: false,
    score: 0,
    level: 1,
    lives: STARTING_LIVES,
    combo: 1,
    completedRecipes: 0,
    timeLeft: STARTING_TIME,
    activeRecipes: [],
    cauldron: [],
    fallingItems: [],
    itemId: 0,
    spawnAccumulator: 0,
    lastFrameTime: 0,
    bestScore: 0,
    soundEnabled: true,
    audioContext: null
  };

  const elements = {
    bestScore: getRequiredElement("bestScore"),
    scoreValue: getRequiredElement("scoreValue"),
    levelValue: getRequiredElement("levelValue"),
    timerValue: getRequiredElement("timerValue"),
    livesValue: getRequiredElement("livesValue"),
    comboValue: getRequiredElement("comboValue"),
    recipeList: getRequiredElement("recipeList"),
    cauldronInventory: getRequiredElement("cauldronInventory"),
    messageCard: getRequiredElement("messageCard"),
    playfield: getRequiredElement("playfield"),
    fallingLayer: getRequiredElement("fallingLayer"),
    cauldronZone: getRequiredElement("cauldronZone"),
    menuScreen: getRequiredElement("menuScreen"),
    gameOverScreen: getRequiredElement("gameOverScreen"),
    helpModal: getRequiredElement("helpModal"),
    startButton: getRequiredElement("startButton"),
    restartButton: getRequiredElement("restartButton"),
    backToMenuButton: getRequiredElement("backToMenuButton"),
    helpButton: getRequiredElement("helpButton"),
    menuHelpButton: getRequiredElement("menuHelpButton"),
    closeHelpButton: getRequiredElement("closeHelpButton"),
    helpBackdrop: getRequiredElement("helpBackdrop"),
    soundButton: getRequiredElement("soundButton"),
    finalScore: getRequiredElement("finalScore"),
    finalLevel: getRequiredElement("finalLevel"),
    finalRecipes: getRequiredElement("finalRecipes"),
    gameOverMessage: getRequiredElement("gameOverMessage")
  };

  function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function safeNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function ingredientById(id) {
    return ingredients.find((ingredient) => ingredient.id === id);
  }

  function loadBestScore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = Number.parseInt(raw || "0", 10);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_SCORE ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(score) {
    try {
      const safeScore = clamp(Math.trunc(safeNumber(score, 0)), 0, MAX_SCORE);
      window.localStorage.setItem(STORAGE_KEY, String(safeScore));
    } catch {
      // Local storage can be unavailable in private or restricted browsing.
    }
  }

  function setScreen(screen, visible) {
    screen.classList.toggle("is-active", visible);
  }

  function setMessage(message, tone) {
    elements.messageCard.textContent = message;
    elements.messageCard.classList.remove("is-good", "is-bad");

    if (tone === "good") {
      elements.messageCard.classList.add("is-good");
    }

    if (tone === "bad") {
      elements.messageCard.classList.add("is-bad");
    }
  }

  function updateHud() {
    elements.scoreValue.textContent = String(state.score);
    elements.levelValue.textContent = String(state.level);
    elements.timerValue.textContent = String(Math.ceil(state.timeLeft));
    elements.livesValue.textContent = "💖".repeat(Math.max(state.lives, 0));
    elements.comboValue.textContent = `x${state.combo}`;
    elements.bestScore.textContent = String(state.bestScore);
  }

  function makeIngredientPill(ingredientId) {
    const ingredient = ingredientById(ingredientId);
    const pill = document.createElement("span");
    pill.className = "ingredient-pill";

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = ingredient ? ingredient.icon : "✨";

    const name = document.createElement("span");
    name.textContent = ingredient ? ingredient.name : "Mystery";

    pill.append(icon, name);
    return pill;
  }

  function renderRecipes() {
    elements.recipeList.textContent = "";

    state.activeRecipes.forEach((recipe) => {
      const card = document.createElement("article");
      card.className = "recipe-card";
      card.style.setProperty("--accent", recipe.color);

      const top = document.createElement("div");
      top.className = "recipe-card__top";

      const nameWrap = document.createElement("div");
      nameWrap.className = "recipe-card__name";

      const icon = document.createElement("span");
      icon.className = "recipe-card__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = recipe.icon;

      const name = document.createElement("span");
      name.textContent = recipe.name;

      nameWrap.append(icon, name);

      const points = document.createElement("span");
      points.className = "recipe-card__points";
      points.textContent = `${recipe.points} pts`;

      top.append(nameWrap, points);

      const ingredientRow = document.createElement("div");
      ingredientRow.className = "ingredient-row";

      recipe.ingredients.forEach((ingredientId) => {
        ingredientRow.appendChild(makeIngredientPill(ingredientId));
      });

      card.append(top, ingredientRow);
      elements.recipeList.appendChild(card);
    });
  }

  function renderCauldron() {
    elements.cauldronInventory.textContent = "";

    if (state.cauldron.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-brew";
      empty.textContent = "Nothing yet. The cauldron is waiting politely.";
      elements.cauldronInventory.appendChild(empty);
      return;
    }

    state.cauldron.forEach((ingredientId) => {
      elements.cauldronInventory.appendChild(makeIngredientPill(ingredientId));
    });
  }

  function getCounts(list) {
    return list.reduce((counts, id) => {
      counts[id] = (counts[id] || 0) + 1;
      return counts;
    }, {});
  }

  function countsFitInside(innerList, outerList) {
    const inner = getCounts(innerList);
    const outer = getCounts(outerList);

    return Object.keys(inner).every((id) => inner[id] <= (outer[id] || 0));
  }

  function countsEqual(leftList, rightList) {
    const left = getCounts(leftList);
    const right = getCounts(rightList);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

    for (const key of keys) {
      if ((left[key] || 0) !== (right[key] || 0)) {
        return false;
      }
    }

    return true;
  }

  function findCompletedRecipe() {
    return state.activeRecipes.find((recipe) => countsEqual(state.cauldron, recipe.ingredients));
  }

  function isPossibleBrew() {
    return state.activeRecipes.some((recipe) => countsFitInside(state.cauldron, recipe.ingredients));
  }

  function drawRecipes() {
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    state.activeRecipes = shuffled.slice(0, 3);
  }

  function replaceRecipe(recipeId) {
    const usedIds = new Set(state.activeRecipes.map((recipe) => recipe.id));
    const candidates = recipes.filter((recipe) => !usedIds.has(recipe.id) || recipe.id === recipeId);
    const nextRecipe = randomFrom(candidates);
    const index = state.activeRecipes.findIndex((recipe) => recipe.id === recipeId);

    if (index >= 0) {
      state.activeRecipes[index] = nextRecipe;
    }
  }

  function startGame() {
    state.running = true;
    state.score = 0;
    state.level = 1;
    state.lives = STARTING_LIVES;
    state.combo = 1;
    state.completedRecipes = 0;
    state.timeLeft = STARTING_TIME;
    state.cauldron = [];
    state.spawnAccumulator = 0;
    state.lastFrameTime = performance.now();

    clearFallingItems();
    drawRecipes();
    renderRecipes();
    renderCauldron();
    updateHud();

    setMessage("Grab recipe ingredients and make the cauldron proud.", "good");
    setScreen(elements.menuScreen, false);
    setScreen(elements.gameOverScreen, false);
    closeHelp();

    spawnIngredient();
    spawnIngredient();
    spawnIngredient();

    requestAnimationFrame(gameLoop);
    playSound("start");
  }

  function endGame(reason) {
    if (!state.running) {
      return;
    }

    state.running = false;
    clearFallingItems();

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }

    elements.finalScore.textContent = String(state.score);
    elements.finalLevel.textContent = String(state.level);
    elements.finalRecipes.textContent = String(state.completedRecipes);
    elements.gameOverMessage.textContent = reason || getEndMessage();

    updateHud();
    setScreen(elements.gameOverScreen, true);
    playSound("gameover");
  }

  function getEndMessage() {
    if (state.score >= 3000) {
      return "Legendary bubbling. The town will speak of this foam for weeks.";
    }

    if (state.score >= 1600) {
      return "Very respectable magic. The cauldron is doing a tiny bow.";
    }

    if (state.completedRecipes >= 5) {
      return "Solid brew shift. A few bubbles escaped, but morale remains high.";
    }

    return "A humble start. Even master witches once made suspicious soup.";
  }

  function clearFallingItems() {
    state.fallingItems.forEach((item) => item.node.remove());
    state.fallingItems = [];
    elements.fallingLayer.textContent = "";
  }

  function getSpawnInterval() {
    return clamp(1250 - state.level * 95, 430, 1250);
  }

  function getFallSpeed() {
    return 86 + state.level * 14;
  }

  function getNeededIngredientIds() {
    return state.activeRecipes.flatMap((recipe) => recipe.ingredients);
  }

  function chooseSpawnIngredientId() {
    const needed = getNeededIngredientIds();
    const neededChance = clamp(0.84 - state.level * 0.035, 0.54, 0.84);

    if (needed.length > 0 && Math.random() < neededChance) {
      return randomFrom(needed);
    }

    return randomFrom(ingredients).id;
  }

  function isIngredientNeeded(ingredientId) {
    return getNeededIngredientIds().includes(ingredientId);
  }

  function spawnIngredient() {
    if (!state.running || state.fallingItems.length >= MAX_ACTIVE_ITEMS) {
      return;
    }

    const ingredientId = chooseSpawnIngredientId();
    const ingredient = ingredientById(ingredientId);
    const playfieldRect = elements.playfield.getBoundingClientRect();
    const size = playfieldRect.width < 680 ? 56 : 62;
    const x = Math.random() * Math.max(playfieldRect.width - size - 16, 10) + 8;
    const y = -size - Math.random() * 70;
    const speed = getFallSpeed() + Math.random() * 34;

    const node = document.createElement("button");
    node.type = "button";
    node.className = "ingredient";
    node.textContent = ingredient ? ingredient.icon : "✨";
    node.setAttribute("aria-label", ingredient ? `Add ${ingredient.name}` : "Add mystery ingredient");
    node.dataset.itemId = String(state.itemId);
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;

    if (isIngredientNeeded(ingredientId)) {
      node.classList.add("is-needed");
    }

    const item = {
      id: state.itemId,
      ingredientId,
      node,
      x,
      y,
      size,
      speed,
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0
    };

    state.itemId += 1;
    attachIngredientEvents(item);
    state.fallingItems.push(item);
    elements.fallingLayer.appendChild(node);
    updateItemPosition(item);
  }

  function attachIngredientEvents(item) {
    item.node.addEventListener("pointerdown", (event) => {
      if (!state.running) {
        return;
      }

      event.preventDefault();
      item.dragging = true;
      item.pointerId = event.pointerId;
      item.startX = event.clientX;
      item.startY = event.clientY;
      item.node.classList.add("is-dragging");
      item.node.setPointerCapture(event.pointerId);
      moveItemToPointer(item, event);
    });

    item.node.addEventListener("pointermove", (event) => {
      if (!item.dragging || item.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      moveItemToPointer(item, event);
    });

    item.node.addEventListener("pointerup", (event) => {
      finishPointerAction(item, event);
    });

    item.node.addEventListener("pointercancel", (event) => {
      finishPointerAction(item, event, true);
    });

    item.node.addEventListener("keydown", (event) => {
      if (!state.running) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        collectIngredient(item);
      }
    });
  }

  function moveItemToPointer(item, event) {
    const rect = elements.playfield.getBoundingClientRect();
    item.x = clamp(event.clientX - rect.left - item.size / 2, 0, rect.width - item.size);
    item.y = clamp(event.clientY - rect.top - item.size / 2, 0, rect.height - item.size);
    updateItemPosition(item);
  }

  function finishPointerAction(item, event, cancelled = false) {
    if (!item.dragging || item.pointerId !== event.pointerId) {
      return;
    }

    const movedDistance = Math.hypot(event.clientX - item.startX, event.clientY - item.startY);
    item.dragging = false;
    item.pointerId = null;
    item.node.classList.remove("is-dragging");

    if (item.node.hasPointerCapture(event.pointerId)) {
      item.node.releasePointerCapture(event.pointerId);
    }

    if (cancelled) {
      return;
    }

    if (movedDistance < 10 || overlaps(item.node, elements.cauldronZone)) {
      collectIngredient(item);
    }
  }

  function overlaps(source, target) {
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    return !(sourceRect.right < targetRect.left || sourceRect.left > targetRect.right || sourceRect.bottom < targetRect.top || sourceRect.top > targetRect.bottom);
  }

  function updateItemPosition(item) {
    item.node.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
  }

  function removeFallingItem(item) {
    item.node.remove();
    state.fallingItems = state.fallingItems.filter((fallingItem) => fallingItem.id !== item.id);
  }

  function collectIngredient(item) {
    if (!state.running) {
      return;
    }

    removeFallingItem(item);
    state.cauldron.push(item.ingredientId);
    renderCauldron();
    pulseCauldron("hot");
    playSound("drop");

    const completedRecipe = findCompletedRecipe();

    if (completedRecipe) {
      completeRecipe(completedRecipe);
      return;
    }

    if (!isPossibleBrew()) {
      failBrew(randomFrom(failMessages));
      return;
    }

    const ingredient = ingredientById(item.ingredientId);
    const ingredientName = ingredient ? ingredient.name : "Mystery";
    setMessage(`${ingredientName} added. The brew is still behaving.`, "good");
  }

  function completeRecipe(recipe) {
    state.completedRecipes += 1;

    const oldCombo = state.combo;
    const comboBonus = Math.max(0, oldCombo - 1) * 42;
    const levelBonus = state.level * 12;
    const points = recipe.points + comboBonus + levelBonus;

    state.score = clamp(state.score + points, 0, MAX_SCORE);
    state.combo = clamp(state.combo + 1, 1, 9);
    state.level = Math.floor(state.completedRecipes / 3) + 1;
    state.timeLeft = clamp(state.timeLeft + 4 + Math.min(state.combo, 5), 0, 90);
    state.cauldron = [];

    showPointPop(points);
    replaceRecipe(recipe.id);
    renderRecipes();
    renderCauldron();
    updateHud();

    const comboText = state.combo >= 3 ? ` Combo x${state.combo}!` : "";
    setMessage(`${randomFrom(successMessages)} +${points} points.${comboText}`, "good");
    playSound("success");
  }

  function failBrew(message) {
    state.cauldron = [];
    state.combo = 1;
    loseLife(message || randomFrom(failMessages), true);
    renderCauldron();
    updateHud();
    playSound("fail");
  }

  function loseLife(message, shake) {
    if (!state.running) {
      return;
    }

    state.lives -= 1;
    state.combo = 1;

    if (shake) {
      pulseCauldron("shake");
    }

    setMessage(message, "bad");
    updateHud();

    if (state.lives <= 0) {
      endGame("The shop ran out of spare hearts. Cleanup goblins have been summoned.");
    }
  }

  function missIngredient(item) {
    removeFallingItem(item);
    loseLife("Ingredient overflow! The floor is now lightly enchanted.", false);
    playSound("miss");
  }

  function pulseCauldron(type) {
    const className = type === "shake" ? "is-shaking" : "is-hot";
    elements.cauldronZone.classList.add(className);

    window.setTimeout(() => {
      elements.cauldronZone.classList.remove(className);
    }, type === "shake" ? 380 : 520);
  }

  function showPointPop(points) {
    const pop = document.createElement("span");
    pop.className = "pop-points";
    pop.textContent = `+${points}`;

    const zoneRect = elements.cauldronZone.getBoundingClientRect();
    const fieldRect = elements.playfield.getBoundingClientRect();

    pop.style.left = `${zoneRect.left - fieldRect.left + zoneRect.width / 2 - 32}px`;
    pop.style.top = `${zoneRect.top - fieldRect.top + 26}px`;

    elements.playfield.appendChild(pop);

    window.setTimeout(() => {
      pop.remove();
    }, 950);
  }

  function gameLoop(now) {
    if (!state.running) {
      return;
    }

    const deltaSeconds = clamp((now - state.lastFrameTime) / 1000, 0, 0.05);
    state.lastFrameTime = now;

    state.timeLeft -= deltaSeconds;
    state.spawnAccumulator += deltaSeconds * 1000;

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHud();
      endGame("Time bubbled away. The last potion is mostly decorative.");
      return;
    }

    if (state.spawnAccumulator >= getSpawnInterval()) {
      state.spawnAccumulator = 0;
      spawnIngredient();
    }

    updateFallingItems(deltaSeconds);
    updateHud();

    requestAnimationFrame(gameLoop);
  }

  function updateFallingItems(deltaSeconds) {
    const playfieldHeight = elements.playfield.clientHeight;
    const itemsSnapshot = [...state.fallingItems];

    itemsSnapshot.forEach((item) => {
      if (item.dragging) {
        return;
      }

      item.y += item.speed * deltaSeconds;
      updateItemPosition(item);

      if (item.y > playfieldHeight - 24) {
        missIngredient(item);
      }
    });
  }

  function openHelp() {
    elements.helpModal.classList.add("is-active");
  }

  function closeHelp() {
    elements.helpModal.classList.remove("is-active");
  }

  function showMainMenu() {
    state.running = false;
    clearFallingItems();
    setScreen(elements.gameOverScreen, false);
    setScreen(elements.menuScreen, true);
    setMessage("Welcome, apprentice brewer!", "");
    state.cauldron = [];
    renderCauldron();
    updateHud();
  }

  function ensureAudioContext() {
    if (!state.soundEnabled || state.audioContext) {
      return state.audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    state.audioContext = new AudioContextClass();
    return state.audioContext;
  }

  function playSound(kind) {
    if (!state.soundEnabled) {
      return;
    }

    const audio = ensureAudioContext();

    if (!audio) {
      return;
    }

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    const settings = {
      start: [392, 523],
      drop: [520, 660],
      success: [660, 880],
      fail: [240, 160],
      miss: [220, 180],
      gameover: [196, 147]
    }[kind] || [440, 550];

    oscillator.type = kind === "fail" || kind === "gameover" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(settings[0], now);
    oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.soundButton.textContent = state.soundEnabled ? "🔔" : "🔕";

    if (state.soundEnabled) {
      playSound("drop");
    }
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startGame);
    elements.restartButton.addEventListener("click", startGame);
    elements.backToMenuButton.addEventListener("click", showMainMenu);
    elements.helpButton.addEventListener("click", openHelp);
    elements.menuHelpButton.addEventListener("click", openHelp);
    elements.closeHelpButton.addEventListener("click", closeHelp);
    elements.helpBackdrop.addEventListener("click", closeHelp);
    elements.soundButton.addEventListener("click", toggleSound);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeHelp();
      }
    });

    window.addEventListener("blur", () => {
      if (state.running) {
        setMessage("Paused-ish: click back in and keep brewing!", "");
      }
    });
  }

  function init() {
    state.bestScore = loadBestScore();
    drawRecipes();
    renderRecipes();
    renderCauldron();
    updateHud();
    bindEvents();
  }

  init();
})();
