const state = {
  setupPlayers: ["", ""],
  players: [],
  pack: null,
  usedQuestions: new Set(),
  activeQuestion: null,
  wrongPlayers: new Set(),
  source: "demo",
  final: {
    finalists: [],
    question: null,
    source: "demo",
    timerId: null,
    secondsLeft: 60,
    resolvedPlayers: new Set(),
    started: false
  },
  millionaire: {
    player: "",
    pack: null,
    source: "demo",
    index: 0,
    locked: false,
    hiddenOptions: new Set(),
    lifelines: {
      fifty: false,
      audience: false,
      expert: false
    },
    guaranteed: 0,
    finished: false
  }
};

const views = [
  document.querySelector("#homeView"),
  document.querySelector("#setupView"),
  document.querySelector("#finalView"),
  document.querySelector("#millionaireSetupView"),
  document.querySelector("#gameView"),
  document.querySelector("#millionaireGameView")
];

const playersForm = document.querySelector("#playersForm");
const addPlayerButton = document.querySelector("#addPlayerButton");
const startButton = document.querySelector("#startButton");
const newGameButton = document.querySelector("#newGameButton");
const chooseJeopardyButton = document.querySelector("#chooseJeopardyButton");
const chooseMillionaireButton = document.querySelector("#chooseMillionaireButton");
const setupMessage = document.querySelector("#setupMessage");
const apiStatus = document.querySelector("#apiStatus");
const scoreboard = document.querySelector("#scoreboard");
const board = document.querySelector("#board");
const packTitle = document.querySelector("#packTitle");
const sourceLabel = document.querySelector("#sourceLabel");
const finishNote = document.querySelector("#finishNote");
const finalistsGrid = document.querySelector("#finalistsGrid");
const startFinalQuestionButton = document.querySelector("#startFinalQuestionButton");
const finalBetActions = document.querySelector("#finalBetActions");
const finalMessage = document.querySelector("#finalMessage");
const finalSourceLabel = document.querySelector("#finalSourceLabel");
const finalQuestionBox = document.querySelector("#finalQuestionBox");
const finalCategory = document.querySelector("#finalCategory");
const finalTimer = document.querySelector("#finalTimer");
const finalQuestionText = document.querySelector("#finalQuestionText");
const finalAnswerBox = document.querySelector("#finalAnswerBox");
const finalAnswerText = document.querySelector("#finalAnswerText");
const finalFactText = document.querySelector("#finalFactText");
const showFinalAnswerButton = document.querySelector("#showFinalAnswerButton");
const finalCorrectButtons = document.querySelector("#finalCorrectButtons");
const finalWrongButtons = document.querySelector("#finalWrongButtons");
const finalBackButton = document.querySelector("#finalBackButton");
const championPanel = document.querySelector("#championPanel");
const championTitle = document.querySelector("#championTitle");
const championScore = document.querySelector("#championScore");

const millionairePlayerInput = document.querySelector("#millionairePlayerInput");
const startMillionaireButton = document.querySelector("#startMillionaireButton");
const millionaireSetupMessage = document.querySelector("#millionaireSetupMessage");
const newMillionaireButton = document.querySelector("#newMillionaireButton");
const millionaireSourceLabel = document.querySelector("#millionaireSourceLabel");
const millionairePlayerName = document.querySelector("#millionairePlayerName");
const millionaireCurrentPrize = document.querySelector("#millionaireCurrentPrize");
const millionaireLevelLabel = document.querySelector("#millionaireLevelLabel");
const millionaireQuestionText = document.querySelector("#millionaireQuestionText");
const millionaireOptions = document.querySelector("#millionaireOptions");
const millionaireFeedback = document.querySelector("#millionaireFeedback");
const moneyLadder = document.querySelector("#moneyLadder");
const fiftyButton = document.querySelector("#fiftyButton");
const audienceButton = document.querySelector("#audienceButton");
const expertButton = document.querySelector("#expertButton");
const takeMoneyButton = document.querySelector("#takeMoneyButton");
const nextMillionaireButton = document.querySelector("#nextMillionaireButton");

const questionDialog = document.querySelector("#questionDialog");
const questionCategory = document.querySelector("#questionCategory");
const questionValue = document.querySelector("#questionValue");
const questionText = document.querySelector("#questionText");
const answerBox = document.querySelector("#answerBox");
const answerText = document.querySelector("#answerText");
const factText = document.querySelector("#factText");
const showAnswerButton = document.querySelector("#showAnswerButton");
const returnQuestionButton = document.querySelector("#returnQuestionButton");
const skipQuestionButton = document.querySelector("#skipQuestionButton");
const correctButtons = document.querySelector("#correctButtons");
const wrongButtons = document.querySelector("#wrongButtons");

const optionLetters = ["A", "B", "C", "D"];

init();

function init() {
  renderPlayerInputs();
  bindEvents();
  checkApiStatus();
  showView("homeView");
}

function bindEvents() {
  chooseJeopardyButton.addEventListener("click", () => {
    setupMessage.textContent = "";
    showView("setupView");
  });

  chooseMillionaireButton.addEventListener("click", () => {
    millionaireSetupMessage.textContent = "";
    showView("millionaireSetupView");
  });

  document.querySelectorAll("[data-go-home]").forEach((button) => {
    button.addEventListener("click", () => showView("homeView"));
  });

  addPlayerButton.addEventListener("click", () => {
    state.setupPlayers.push("");
    renderPlayerInputs();
  });

  startButton.addEventListener("click", startGame);
  newGameButton.addEventListener("click", () => showView("setupView"));

  startMillionaireButton.addEventListener("click", startMillionaire);
  newMillionaireButton.addEventListener("click", () => showView("millionaireSetupView"));
  fiftyButton.addEventListener("click", useFifty);
  audienceButton.addEventListener("click", useAudience);
  expertButton.addEventListener("click", useExpert);
  takeMoneyButton.addEventListener("click", takeMillionaireMoney);
  nextMillionaireButton.addEventListener("click", nextMillionaireQuestion);
  startFinalQuestionButton.addEventListener("click", startFinalQuestion);
  showFinalAnswerButton.addEventListener("click", () => {
    finalAnswerBox.classList.remove("hidden");
    showFinalAnswerButton.classList.add("hidden");
  });
  finalBackButton.addEventListener("click", () => showView("gameView"));

  showAnswerButton.addEventListener("click", () => {
    answerBox.classList.remove("hidden");
    showAnswerButton.classList.add("hidden");
  });

  returnQuestionButton.addEventListener("click", closeQuestion);
  skipQuestionButton.addEventListener("click", () => finishQuestion());
}

function showView(id) {
  views.forEach((view) => view.classList.toggle("hidden", view.id !== id));
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    apiStatus.textContent = status.configured ? "Подключен" : "Демо без ключа";
    apiStatus.className = `status-pill ${status.configured ? "ready" : "demo"}`;
  } catch (error) {
    apiStatus.textContent = "Сервер недоступен";
    apiStatus.className = "status-pill demo";
  }
}

function renderPlayerInputs() {
  playersForm.innerHTML = "";

  state.setupPlayers.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const input = document.createElement("input");
    input.className = "text-input";
    input.type = "text";
    input.maxLength = 32;
    input.placeholder = `Участник ${index + 1}`;
    input.value = name;
    input.addEventListener("input", () => {
      state.setupPlayers[index] = input.value;
    });

    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.title = "Удалить участника";
    removeButton.textContent = "×";
    removeButton.disabled = state.setupPlayers.length <= 1;
    removeButton.addEventListener("click", () => {
      state.setupPlayers.splice(index, 1);
      renderPlayerInputs();
    });

    row.append(input, removeButton);
    playersForm.append(row);
  });
}

async function startGame() {
  const names = state.setupPlayers.map((name) => name.trim()).filter(Boolean);
  const uniqueNames = [...new Set(names)];

  if (!uniqueNames.length) {
    setupMessage.textContent = "Введите хотя бы одного участника.";
    return;
  }

  startButton.disabled = true;
  startButton.textContent = "Генерируем вопросы...";
  setupMessage.textContent = "Это может занять до минуты.";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (!response.ok && !data.pack) {
      throw new Error(data.error || "Не удалось сгенерировать вопросы.");
    }

    state.players = uniqueNames.map((name, index) => ({
      id: `p${index}`,
      name,
      score: 0
    }));
    state.pack = data.pack;
    state.source = data.source || "gigachat";
    state.usedQuestions = new Set();
    state.activeQuestion = null;
    state.wrongPlayers = new Set();
    resetFinalState();

    setupMessage.textContent = "";
    renderGame();
    showView("gameView");
  } catch (error) {
    setupMessage.textContent = error.message;
  } finally {
    startButton.disabled = false;
    startButton.textContent = "Сгенерировать и начать";
  }
}

function renderGame() {
  packTitle.textContent = state.pack.title || "Своя игра";
  finishNote.textContent = "";
  sourceLabel.textContent =
    state.source === "gigachat" ? "Вопросы сгенерированы GigaChat" : "Демо-пакет";
  renderScores();
  renderBoard();
}

function renderScores() {
  scoreboard.innerHTML = "";
  const topScore = Math.max(...state.players.map((player) => player.score));

  state.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = `score-card ${player.score === topScore && topScore !== 0 ? "leading" : ""}`;

    const name = document.createElement("div");
    name.className = "score-name";
    name.textContent = player.name;

    const score = document.createElement("div");
    score.className = "score-value";
    score.textContent = player.score;

    card.append(name, score);
    scoreboard.append(card);
  });
}

function renderBoard() {
  board.innerHTML = "";

  state.pack.categories.forEach((category, categoryIndex) => {
    const categoryCell = document.createElement("div");
    categoryCell.className = "category-cell";
    categoryCell.textContent = category.title;
    board.append(categoryCell);

    category.questions.forEach((question, questionIndex) => {
      const normalizedQuestion = {
        ...question,
        id: question.id || `c${categoryIndex}-q${questionIndex}`,
        categoryTitle: category.title
      };
      const button = document.createElement("button");
      button.className = `question-cell ${
        state.usedQuestions.has(normalizedQuestion.id) ? "used" : ""
      }`;
      button.type = "button";
      button.textContent = state.usedQuestions.has(normalizedQuestion.id)
        ? ""
        : normalizedQuestion.value;
      button.disabled = state.usedQuestions.has(normalizedQuestion.id);
      button.addEventListener("click", () => openQuestion(normalizedQuestion));
      board.append(button);
    });
  });
}

function openQuestion(question) {
  state.activeQuestion = question;
  state.wrongPlayers = new Set();

  questionCategory.textContent = question.categoryTitle;
  questionValue.textContent = question.value;
  questionText.textContent = question.question;
  answerText.textContent = question.answer;
  factText.textContent = question.fact || "";
  answerBox.classList.add("hidden");
  showAnswerButton.classList.remove("hidden");

  renderJudgeButtons();
  questionDialog.showModal();
}

function renderJudgeButtons() {
  correctButtons.innerHTML = "";
  wrongButtons.innerHTML = "";

  state.players.forEach((player) => {
    const correctButton = document.createElement("button");
    correctButton.className = "judge-button correct";
    correctButton.type = "button";
    correctButton.textContent = `${player.name} +${state.activeQuestion.value}`;
    correctButton.disabled = state.wrongPlayers.has(player.id);
    correctButton.addEventListener("click", () => {
      player.score += state.activeQuestion.value;
      finishQuestion();
    });

    const wrongButton = document.createElement("button");
    wrongButton.className = "judge-button wrong";
    wrongButton.type = "button";
    wrongButton.textContent = `${player.name} -${state.activeQuestion.value}`;
    wrongButton.disabled = state.wrongPlayers.has(player.id);
    wrongButton.addEventListener("click", () => {
      player.score -= state.activeQuestion.value;
      state.wrongPlayers.add(player.id);
      renderScores();
      renderJudgeButtons();
    });

    correctButtons.append(correctButton);
    wrongButtons.append(wrongButton);
  });
}

function finishQuestion() {
  if (state.activeQuestion) {
    state.usedQuestions.add(state.activeQuestion.id);
  }
  closeQuestion();
  renderGame();
  showWinnerIfFinished();
}

function closeQuestion() {
  state.activeQuestion = null;
  state.wrongPlayers = new Set();
  questionDialog.close();
}

function showWinnerIfFinished() {
  const totalQuestions = state.pack.categories.reduce(
    (sum, category) => sum + category.questions.length,
    0
  );
  if (state.usedQuestions.size !== totalQuestions) {
    return;
  }

  prepareFinalRound();
}

function resetFinalState() {
  if (state.final.timerId) {
    clearInterval(state.final.timerId);
  }
  state.final = {
    finalists: [],
    question: null,
    source: "demo",
    timerId: null,
    secondsLeft: 60,
    resolvedPlayers: new Set(),
    started: false
  };
}

function prepareFinalRound() {
  const finalists = [...state.players]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((player) => ({
      ...player,
      wager: Math.max(0, Math.min(Math.max(0, player.score), Math.max(0, Math.floor(player.score / 2))))
    }));

  if (finalists.length < 2) {
    const winner = state.players[0];
    finishNote.textContent = `Победитель: ${winner.name}, ${winner.score} очков.`;
    return;
  }

  state.final.finalists = finalists;
  state.final.started = false;
  finishNote.textContent = "Основное поле завершено. Два лидера проходят в финал.";
  renderFinalSetup();
  showView("finalView");
}

function renderFinalSetup() {
  finalSourceLabel.textContent = "Ставки финалистов";
  finalQuestionBox.classList.add("hidden");
  finalBetActions.classList.remove("hidden");
  finalAnswerBox.classList.add("hidden");
  showFinalAnswerButton.classList.remove("hidden");
  championPanel.classList.add("hidden");
  finalMessage.textContent = "";
  finalistsGrid.innerHTML = "";

  state.final.finalists.forEach((player, index) => {
    const card = document.createElement("article");
    card.className = "finalist-card";
    const maxWager = Math.max(0, player.score);
    card.innerHTML = `
      <div>
        <p class="eyebrow">Финалист ${index + 1}</p>
        <h3>${escapeHtml(player.name)}</h3>
      </div>
      <strong>${player.score} очков</strong>
      <label>
        <span class="field-label">Ставка</span>
        <input class="text-input final-wager-input" type="number" min="0" max="${maxWager}" step="1" value="${player.wager}" data-player-id="${player.id}" />
      </label>
    `;
    finalistsGrid.append(card);
  });

  finalistsGrid.querySelectorAll(".final-wager-input").forEach((input) => {
    input.addEventListener("input", () => {
      const finalist = state.final.finalists.find((player) => player.id === input.dataset.playerId);
      if (!finalist) return;
      const value = Number.parseInt(input.value || "0", 10);
      finalist.wager = Math.max(0, Math.min(finalist.score, Number.isFinite(value) ? value : 0));
      input.value = finalist.wager;
    });
  });
}

async function startFinalQuestion() {
  startFinalQuestionButton.disabled = true;
  startFinalQuestionButton.textContent = "Генерируем финал...";
  finalMessage.textContent = "Готовим сложный вопрос.";

  try {
    const response = await fetch("/api/generate-final", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (!response.ok && !data.question) {
      throw new Error(data.error || "Не удалось сгенерировать финальный вопрос.");
    }

    state.final.question = data.question;
    state.final.source = data.source || "gigachat";
    state.final.started = true;
    state.final.resolvedPlayers = new Set();
    state.final.secondsLeft = 60;
    renderFinalQuestion();
    startFinalTimer();
  } catch (error) {
    finalMessage.textContent = error.message;
  } finally {
    startFinalQuestionButton.disabled = false;
    startFinalQuestionButton.textContent = "Открыть финальный вопрос";
  }
}

function renderFinalQuestion() {
  const question = state.final.question;
  finalSourceLabel.textContent =
    state.final.source === "gigachat" ? "Финал сгенерирован GigaChat" : "Финальный демо-вопрос";
  finalBetActions.classList.add("hidden");
  finalQuestionBox.classList.remove("hidden");
  finalAnswerBox.classList.add("hidden");
  showFinalAnswerButton.classList.remove("hidden");
  finalCategory.textContent = question.category || "Финал";
  finalQuestionText.textContent = question.question;
  finalAnswerText.textContent = question.answer;
  finalFactText.textContent = question.fact || "";
  finalTimer.textContent = formatTimer(state.final.secondsLeft);
  renderFinalJudgeButtons();
}

function startFinalTimer() {
  if (state.final.timerId) {
    clearInterval(state.final.timerId);
  }
  state.final.timerId = setInterval(() => {
    state.final.secondsLeft -= 1;
    finalTimer.textContent = formatTimer(state.final.secondsLeft);
    if (state.final.secondsLeft <= 0) {
      clearInterval(state.final.timerId);
      state.final.timerId = null;
      finalTimer.textContent = "00:00";
      finalMessage.textContent = "Время вышло. Ведущий может показать ответ и отметить результат.";
    }
  }, 1000);
}

function renderFinalJudgeButtons() {
  finalCorrectButtons.innerHTML = "";
  finalWrongButtons.innerHTML = "";

  state.final.finalists.forEach((player) => {
    const correctButton = document.createElement("button");
    correctButton.className = "judge-button correct";
    correctButton.type = "button";
    correctButton.textContent = `${player.name} +${player.wager}`;
    correctButton.disabled = state.final.resolvedPlayers.has(player.id);
    correctButton.addEventListener("click", () => resolveFinalAnswer(player.id, true));

    const wrongButton = document.createElement("button");
    wrongButton.className = "judge-button wrong";
    wrongButton.type = "button";
    wrongButton.textContent = `${player.name} -${player.wager}`;
    wrongButton.disabled = state.final.resolvedPlayers.has(player.id);
    wrongButton.addEventListener("click", () => resolveFinalAnswer(player.id, false));

    finalCorrectButtons.append(correctButton);
    finalWrongButtons.append(wrongButton);
  });
}

function resolveFinalAnswer(playerId, isCorrect) {
  const finalist = state.final.finalists.find((player) => player.id === playerId);
  const original = state.players.find((player) => player.id === playerId);
  if (!finalist || !original || state.final.resolvedPlayers.has(playerId)) {
    return;
  }

  const delta = isCorrect ? finalist.wager : -finalist.wager;
  finalist.score += delta;
  original.score += delta;
  state.final.resolvedPlayers.add(playerId);
  renderFinalJudgeButtons();
  renderScores();

  if (state.final.resolvedPlayers.size === state.final.finalists.length) {
    if (state.final.timerId) {
      clearInterval(state.final.timerId);
      state.final.timerId = null;
    }
    const topScore = Math.max(...state.players.map((player) => player.score));
    const winners = state.players.filter((player) => player.score === topScore);
    finalMessage.textContent =
      winners.length === 1
        ? `Победитель: ${winners[0].name}, ${topScore} очков.`
        : `Ничья: ${winners.map((player) => player.name).join(", ")}, ${topScore} очков.`;
    showChampion(winners, topScore);
  }
}

function showChampion(winners, topScore) {
  championPanel.classList.remove("hidden");
  championTitle.textContent =
    winners.length === 1
      ? winners[0].name
      : winners.map((player) => player.name).join(" и ");
  championScore.textContent =
    winners.length === 1
      ? `Итоговый счет: ${topScore} очков`
      : `Ничья чемпионов: ${topScore} очков`;
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

async function startMillionaire() {
  const player = millionairePlayerInput.value.trim() || "Игрок";

  startMillionaireButton.disabled = true;
  startMillionaireButton.textContent = "Генерируем вопросы...";
  millionaireSetupMessage.textContent = "Это может занять до минуты.";

  try {
    const response = await fetch("/api/generate-millionaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json();

    if (!response.ok && !data.pack) {
      throw new Error(data.error || "Не удалось сгенерировать вопросы.");
    }

    state.millionaire = {
      player,
      pack: data.pack,
      source: data.source || "gigachat",
      index: 0,
      locked: false,
      hiddenOptions: new Set(),
      lifelines: {
        fifty: false,
        audience: false,
        expert: false
      },
      guaranteed: 0,
      finished: false
    };

    millionaireSetupMessage.textContent = "";
    renderMillionaire();
    showView("millionaireGameView");
  } catch (error) {
    millionaireSetupMessage.textContent = error.message;
  } finally {
    startMillionaireButton.disabled = false;
    startMillionaireButton.textContent = "Сгенерировать и начать";
  }
}

function currentMillionaireQuestion() {
  return state.millionaire.pack.questions[state.millionaire.index];
}

function renderMillionaire() {
  const game = state.millionaire;
  const question = currentMillionaireQuestion();
  const previousPrize = game.index > 0 ? game.pack.prizes[game.index - 1] : 0;

  millionaireSourceLabel.textContent =
    game.source === "gigachat" ? "Вопросы сгенерированы GigaChat" : "Демо-пакет";
  millionairePlayerName.textContent = game.player;
  millionaireCurrentPrize.textContent = formatMoney(previousPrize);
  millionaireLevelLabel.textContent = `Вопрос ${game.index + 1} из 15`;
  millionaireQuestionText.textContent = question.question;
  millionaireFeedback.textContent = "";
  nextMillionaireButton.classList.add("hidden");
  takeMoneyButton.disabled = game.finished;
  renderMillionaireOptions(question);
  renderMoneyLadder();
  renderLifelines();
}

function renderMillionaireOptions(question) {
  millionaireOptions.innerHTML = "";
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "millionaire-option";
    button.type = "button";
    button.disabled =
      state.millionaire.locked || state.millionaire.hiddenOptions.has(index);
    button.innerHTML = `<span>${optionLetters[index]}</span><strong>${escapeHtml(option)}</strong>`;
    button.addEventListener("click", () => answerMillionaire(index));
    millionaireOptions.append(button);
  });
}

function answerMillionaire(index) {
  const game = state.millionaire;
  if (game.locked || game.finished) {
    return;
  }

  const question = currentMillionaireQuestion();
  game.locked = true;
  const buttons = [...millionaireOptions.querySelectorAll(".millionaire-option")];

  buttons.forEach((button, optionIndex) => {
    button.disabled = true;
    if (optionIndex === question.correctIndex) {
      button.classList.add("correct");
    }
    if (optionIndex === index && index !== question.correctIndex) {
      button.classList.add("wrong");
    }
  });

  if (index === question.correctIndex) {
    const prize = game.pack.prizes[game.index];
    game.guaranteed = getGuaranteedPrize(game.index, prize);
    millionaireFeedback.textContent =
      game.index === 14
        ? `Верно! ${game.player} выигрывает ${formatMoney(prize)}. ${question.fact || ""}`
        : `Верно! Следующая ступень: ${formatMoney(game.pack.prizes[game.index + 1])}. ${question.fact || ""}`;

    if (game.index === 14) {
      game.finished = true;
      takeMoneyButton.disabled = true;
    } else {
      nextMillionaireButton.classList.remove("hidden");
    }
  } else {
    game.finished = true;
    millionaireFeedback.textContent = `Неверно. Несгораемая сумма: ${formatMoney(game.guaranteed)}. Правильный ответ: ${question.options[question.correctIndex]}. ${question.fact || ""}`;
    takeMoneyButton.disabled = true;
  }
  renderMoneyLadder();
}

function nextMillionaireQuestion() {
  const game = state.millionaire;
  if (game.finished) {
    return;
  }
  game.index += 1;
  game.locked = false;
  game.hiddenOptions = new Set();
  renderMillionaire();
}

function takeMillionaireMoney() {
  const game = state.millionaire;
  const prize = game.index > 0 ? game.pack.prizes[game.index - 1] : 0;
  game.finished = true;
  game.locked = true;
  millionaireFeedback.textContent = `${game.player} забирает ${formatMoney(prize)}. Игра завершена.`;
  [...millionaireOptions.querySelectorAll("button")].forEach((button) => {
    button.disabled = true;
  });
  takeMoneyButton.disabled = true;
  nextMillionaireButton.classList.add("hidden");
}

function useFifty() {
  const game = state.millionaire;
  if (game.lifelines.fifty || game.locked || game.finished) {
    return;
  }
  const question = currentMillionaireQuestion();
  const wrong = [0, 1, 2, 3].filter((index) => index !== question.correctIndex);
  shuffle(wrong)
    .slice(0, 2)
    .forEach((index) => game.hiddenOptions.add(index));
  game.lifelines.fifty = true;
  renderMillionaireOptions(question);
  renderLifelines();
}

function useAudience() {
  const game = state.millionaire;
  if (game.lifelines.audience || game.locked || game.finished) {
    return;
  }
  const question = currentMillionaireQuestion();
  const values = [8, 10, 12, 14];
  values[question.correctIndex] = 56 + Math.floor(Math.random() * 18);
  const total = values.reduce((sum, value) => sum + value, 0);
  const percents = values.map((value) => Math.round((value / total) * 100));
  game.lifelines.audience = true;
  millionaireFeedback.textContent = `Зал склоняется к варианту ${optionLetters[question.correctIndex]}: ${optionLetters.map((letter, index) => `${letter} ${percents[index]}%`).join(", ")}.`;
  renderLifelines();
}

function useExpert() {
  const game = state.millionaire;
  if (game.lifelines.expert || game.locked || game.finished) {
    return;
  }
  const question = currentMillionaireQuestion();
  game.lifelines.expert = true;
  millionaireFeedback.textContent = `Эксперт уверен, что стоит выбрать ${optionLetters[question.correctIndex]}.`;
  renderLifelines();
}

function renderLifelines() {
  fiftyButton.disabled = state.millionaire.lifelines.fifty || state.millionaire.locked;
  audienceButton.disabled = state.millionaire.lifelines.audience || state.millionaire.locked;
  expertButton.disabled = state.millionaire.lifelines.expert || state.millionaire.locked;
}

function renderMoneyLadder() {
  const game = state.millionaire;
  moneyLadder.innerHTML = "";
  [...game.pack.prizes].reverse().forEach((prize, reverseIndex) => {
    const index = game.pack.prizes.length - 1 - reverseIndex;
    const row = document.createElement("div");
    row.className = `money-row ${index === game.index ? "active" : ""} ${
      [4, 9, 14].includes(index) ? "safe" : ""
    } ${index < game.index ? "passed" : ""}`;
    row.innerHTML = `<span>${index + 1}</span><strong>${formatMoney(prize)}</strong>`;
    moneyLadder.append(row);
  });
}

function getGuaranteedPrize(index, prize) {
  if (index >= 9) {
    return state.millionaire.pack.prizes[9];
  }
  if (index >= 4) {
    return state.millionaire.pack.prizes[4];
  }
  return 0;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function shuffle(items) {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
