const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ENV_FILE = process.env.FEARLESSGAME_ENV_FILE || path.join(__dirname, ".env");
loadEnvFile();

const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = path.join(__dirname, "public");
const GIGACHAT_AUTH_URL =
  process.env.GIGACHAT_AUTH_URL || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_BASE_URL =
  process.env.GIGACHAT_BASE_URL || "https://gigachat.devices.sberbank.ru/api/v1";
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL || "GigaChat";
const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
const IGNORE_TLS = process.env.GIGACHAT_IGNORE_TLS === "true";

let tokenCache = {
  value: "",
  expiresAt: 0
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Слишком большой запрос."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function loadEnvFile() {
  try {
    if (!fs.existsSync(ENV_FILE)) {
      return;
    }

    const content = fs.readFileSync(ENV_FILE, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        return;
      }

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      value = value.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn(`Не удалось прочитать .env: ${error.message}`);
  }
}

function isRealValue(value) {
  const normalized = String(value || "").trim();
  return normalized && !/^ваш_|^your_|^client_/i.test(normalized);
}

function cleanBase64(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function decodesToClientPair(value) {
  try {
    return Buffer.from(cleanBase64(value), "base64").toString("utf8").includes(":");
  } catch (error) {
    return false;
  }
}

function getAuthKey() {
  if (process.env.GIGACHAT_AUTH_KEY) {
    return cleanBase64(process.env.GIGACHAT_AUTH_KEY);
  }

  const clientId = process.env.GIGACHAT_CLIENT_ID;
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;
  if (clientId && clientSecret) {
    if (decodesToClientPair(clientSecret)) {
      return cleanBase64(clientSecret);
    }

    return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  }

  return "";
}

function requestJson(urlString, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payload = body ? Buffer.from(body) : null;
    const requestOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
      headers: { ...options.headers },
      timeout: options.timeout || 45000,
      rejectUnauthorized: !IGNORE_TLS
    };

    if (payload) {
      requestOptions.headers["Content-Length"] = payload.length;
    }

    const req = https.request(requestOptions, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        let data = null;
        try {
          data = responseBody ? JSON.parse(responseBody) : {};
        } catch (error) {
          return reject(new Error(`API вернул не JSON: ${responseBody.slice(0, 200)}`));
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const details = data.message || data.error_description || data.error || responseBody;
          return reject(new Error(`GigaChat API ${res.statusCode}: ${details}`));
        }

        resolve(data);
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Таймаут запроса к GigaChat."));
    });
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }

  const authKey = getAuthKey();
  if (!authKey) {
    throw new Error("Не задан ключ GigaChat.");
  }

  let data = null;
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      data = await requestJson(
        GIGACHAT_AUTH_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            RqUID: crypto.randomUUID()
          }
        },
        new URLSearchParams({ scope: GIGACHAT_SCOPE }).toString()
      );
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 3) {
        throw error;
      }
      await sleep(2500 + attempt * 2500);
    }
  }

  if (!data) {
    throw lastError || new Error("Не удалось получить токен GigaChat.");
  }

  tokenCache = {
    value: data.access_token,
    expiresAt: Number(data.expires_at || Date.now() + 30 * 60_000)
  };

  return tokenCache.value;
}

function buildPrompt(topic) {
  const safeTopic = topic && topic.trim()
    ? topic.trim()
    : "разнообразная общая эрудиция: история, наука, культура, география, искусство, спорт, литература";

  return [
    "Сгенерируй пакет вопросов для русскоязычной игры «Своя игра».",
    `Тема пакета: ${safeTopic}.`,
    "Нужны ровно 5 категорий, в каждой ровно 5 вопросов.",
    "Стоимость вопросов в каждой категории: 100, 200, 300, 400, 500.",
    "Сложность должна расти вместе со стоимостью.",
    "Все категории, вопросы, ответы и справки должны быть только на русском языке.",
    "Не используй английские слова, транслитерацию и латиницу, кроме общепринятых символов вроде pH, DNA, HTML.",
    "Вопросы должны быть однозначными, без вариантов ответа, без устаревших спорных фактов.",
    "У каждого вопроса должен быть один конкретный правильный ответ.",
    "Ответ не должен повторять слова из вопроса и не должен содержать однокоренные слова из текста вопроса.",
    "Не задавай вопросы, где нужно перечислить несколько объектов, назвать несколько причин, несколько авторов или набор элементов.",
    "Избегай формулировок: «какие», «назовите несколько», «перечислите», «какие два», «какие три».",
    "Ответ должен быть коротким, но достаточным для проверки ведущим.",
    "Верни только 25 строк без markdown, заголовков и пояснений.",
    "Формат каждой строки строго такой:",
    "Категория<TAB>Стоимость<TAB>Вопрос<TAB>Ответ<TAB>Короткая справка",
    "Не используй символ табуляции внутри полей, только между полями."
  ].join("\n");
}

async function generateWithGigaChat(topic) {
  const token = await getAccessToken();
  const categoryNames = await generateCategoryNames(token, topic);
  const categoryRows = [];
  for (const categoryName of categoryNames) {
    categoryRows.push(await generateCategoryRows(token, topic, categoryName));
    await sleep(1200);
  }
  const content = categoryRows.join("\n");

  let pack = null;
  try {
    pack = parsePackFromLines(content, topic);
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, "last-gigachat-response.txt"), content, "utf8");
    const repaired = await repairLinesWithGigaChat(token, content, error.message);
    fs.writeFileSync(path.join(__dirname, "last-gigachat-repaired.txt"), repaired, "utf8");
    pack = parsePackFromLines(repaired, topic);
  }

  return verifyJeopardyPackWithGigaChat(token, pack, topic);
}

async function generateFinalQuestionWithGigaChat() {
  const token = await getAccessToken();
  const content = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты редактор финальных вопросов для интеллектуальной игры. Пишешь сложный, точный и однозначный вопрос."
      },
      {
        role: "user",
        content: [
          "Сгенерируй один сложный финальный вопрос для русскоязычной интеллектуальной игры.",
          "Вопрос должен быть уровня финала, но с коротким проверяемым ответом.",
          "Не задавай вопросы на продолжение цитаты, точную реплику персонажа или малоизвестную формулировку.",
          "Выбирай общеизвестный проверяемый факт из истории, науки, географии, искусства или литературы.",
          "Все должно быть на русском языке.",
          "Ответ не должен повторять слова из вопроса и не должен содержать однокоренные слова из текста вопроса.",
          "Верни одну строку строго в формате:",
          "Категория|Вопрос|Ответ|Короткая справка",
          "Не используй вертикальную черту внутри полей."
        ].join("\n")
      }
    ],
    0.55
  );

  const question = parseFinalQuestion(content);
  return verifyFinalQuestionWithGigaChat(token, question);
}

function parseFinalQuestion(content) {
  const parts = content
    .trim()
    .replace(/^```(?:text|csv|tsv)?/i, "")
    .replace(/```$/i, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.includes("|"))
    ?.split("|")
    .map((part) => part.trim());

  if (!parts || parts.length < 4) {
    throw new Error("Не удалось разобрать финальный вопрос.");
  }

  return normalizeFinalQuestion({
    category: parts[0],
    question: parts[1],
    answer: parts[2],
    fact: parts.slice(3).join(" ")
  });
}

async function verifyFinalQuestionWithGigaChat(token, question) {
  const checked = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты строгий фактчекер финальных вопросов. Исправляешь неверный ответ или заменяешь вопрос на точный."
      },
      {
        role: "user",
        content: [
          "Проверь финальный вопрос.",
          "Ответ должен быть фактически верным, коротким и однозначным.",
          "Ответ не должен повторять слова из вопроса и не должен содержать однокоренные слова из текста вопроса.",
          "Вопрос не должен требовать продолжить цитату или вспомнить точную реплику персонажа.",
          "Если вопрос слишком узкий, спорный или плохо проверяемый, замени его на общеизвестный сложный факт.",
          "Если вопрос или ответ сомнительные, замени их.",
          "Верни одну строку строго в формате:",
          "Категория|Вопрос|Ответ|Короткая справка",
          `${question.category}|${question.question}|${question.answer}|${question.fact}`
        ].join("\n")
      }
    ],
    0.1
  );

  try {
    return parseFinalQuestion(checked);
  } catch (error) {
    return question;
  }
}

function normalizeFinalQuestion(question) {
  const fallback = createDemoFinalQuestion();
  const normalized = {
    category: String(question.category || fallback.category).slice(0, 42),
    question: String(question.question || fallback.question).trim(),
    answer: String(question.answer || fallback.answer).trim(),
    fact: String(question.fact || fallback.fact).trim()
  };

  applyJeopardyCapitalFix(normalized);
  if (
    !normalized.question ||
    !normalized.answer ||
    hasTooMuchLatin(Object.values(normalized).join(" ")) ||
    hasQuestionAnswerRootOverlap(normalized.question, [normalized.answer])
  ) {
    return fallback;
  }

  return normalized;
}

function createDemoFinalQuestion() {
  return {
    category: "Финал",
    question: "Какой ученый сформулировал закон всемирного тяготения?",
    answer: "Исаак Ньютон",
    fact: "Закон опубликован в 1687 году в труде «Математические начала натуральной философии»."
  };
}

async function generateCategoryNames(token, topic) {
  const safeTopic = topic && topic.trim()
    ? topic.trim()
    : "разнообразная общая эрудиция: история, наука, культура, география, искусство, спорт, литература";
  const content = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content: "Ты редактор игры «Своя игра». Отвечаешь коротко и строго по формату."
      },
      {
        role: "user",
        content: [
          `Тема пакета: ${safeTopic}.`,
          "Придумай ровно 5 разных коротких названий категорий для игры «Своя игра».",
          "Верни только названия категорий, каждое с новой строки, без нумерации и пояснений."
        ].join("\n")
      }
    ],
    0.5
  );

  const names = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[\).:-]?\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (names.length === 5) {
    return names;
  }

  return ["История", "Наука", "Культура", "География", "Литература"];
}

async function generateCategoryRows(token, topic, categoryName) {
  const safeTopic = topic && topic.trim()
    ? topic.trim()
    : "разнообразная общая эрудиция: история, наука, культура, география, искусство, спорт, литература";
  const content = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content: "Ты редактор интеллектуальных игр. Отвечаешь только строками данных."
      },
      {
        role: "user",
        content: [
          `Общая тема пакета: ${safeTopic}.`,
          `Категория: ${categoryName}.`,
          "Сгенерируй ровно 5 вопросов для этой категории.",
          "Стоимость вопросов строго: 100, 200, 300, 400, 500.",
          "Сложность должна расти вместе со стоимостью.",
          "Все вопросы, ответы и справки должны быть только на русском языке.",
          "Не используй английские слова, транслитерацию и латиницу, кроме общепринятых символов вроде pH, DNA, HTML.",
          "У каждого вопроса должен быть один конкретный правильный ответ.",
          "Ответ не должен повторять слова из вопроса и не должен содержать однокоренные слова из текста вопроса.",
          "Не задавай вопросы, где нужно перечислить несколько объектов, назвать несколько причин, несколько авторов или набор элементов.",
          "Избегай формулировок: «какие», «назовите несколько», «перечислите», «какие два», «какие три».",
          "Верни только 5 строк без markdown, заголовков, нумерации и пояснений.",
          "Формат каждой строки строго такой:",
          `${categoryName}|100|Вопрос|Ответ|Короткая справка`,
          "Разделитель между полями - вертикальная черта |.",
          "Не используй вертикальную черту внутри полей."
        ].join("\n")
      }
    ],
    0.7
  );

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes("|"))
    .slice(0, 5)
    .join("\n");
}

async function requestChatCompletion(token, messages, temperature = 0.75) {
  let data = null;
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      data = await requestJson(
        `${GIGACHAT_BASE_URL.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        },
        JSON.stringify({
          model: GIGACHAT_MODEL,
          messages,
          temperature,
          max_tokens: 6000
        })
      );
      break;
    } catch (error) {
      lastError = error;
      if (!String(error.message).includes("429") || attempt === 3) {
        throw error;
      }
      await sleep(3500 + attempt * 2000);
    }
  }

  if (!data) {
    throw lastError || new Error("GigaChat не вернул ответ.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("GigaChat не вернул текст с вопросами.");
  }

  return content;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function repairLinesWithGigaChat(token, brokenContent, parseError) {
  return requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты исправляешь формат пакета для интеллектуальной игры. Верни только строки данных без markdown."
      },
      {
        role: "user",
        content: [
          `Ошибка разбора: ${parseError}`,
          "Исправь следующий пакет в 25 строк.",
          "Формат каждой строки:",
          "Категория<TAB>Стоимость<TAB>Вопрос<TAB>Ответ<TAB>Короткая справка",
          "Стоимость в каждой категории: 100, 200, 300, 400, 500.",
          "Не добавляй заголовок, нумерацию, пояснения или markdown.",
          brokenContent
        ].join("\n\n")
      }
    ],
    0.1
  );
}

async function verifyJeopardyPackWithGigaChat(token, pack, topic) {
  const serialized = pack.categories
    .flatMap((category) =>
      category.questions.map((question) =>
        [
          category.title,
          question.value,
          question.question,
          question.answer,
          question.fact || ""
        ].join("|")
      )
    )
    .join("\n");

  const checked = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты строгий фактчекер и редактор интеллектуальных игр. Исправляешь фактические ошибки. Если вопрос сомнительный, заменяешь его на точный."
      },
      {
        role: "user",
        content: [
          "Проверь пакет для игры «Своя игра».",
          "Каждый ответ должен быть фактически верным и однозначным.",
          "У каждого вопроса должен быть один конкретный правильный ответ.",
          "Ответ не должен повторять слова из вопроса и не должен содержать однокоренные слова из текста вопроса.",
          "Если вопрос требует перечислить несколько объектов, заменить его на вопрос с одним ответом.",
          "Запрещены вопросы с формулировками «какие», «какие два», «какие три», «перечислите», «назовите несколько».",
          "Если ответ неверный, исправь ответ. Если сам вопрос плохой или спорный, замени весь вопрос на корректный.",
          "Все категории, вопросы, ответы и справки должны быть только на русском языке.",
          "Верни ровно 25 строк без markdown, заголовков и пояснений.",
          "Формат строки:",
          "Категория|Стоимость|Вопрос|Ответ|Короткая справка",
          "Не используй вертикальную черту внутри полей.",
          `Тема: ${topic && topic.trim() ? topic.trim() : "разнообразная общая эрудиция"}`,
          serialized
        ].join("\n\n")
      }
    ],
    0.1
  );

  try {
    return parsePackFromLines(checked, topic);
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, "last-gigachat-verified.txt"), checked, "utf8");
    return pack;
  }
}

function parsePackFromLines(content, topic) {
  const cleaned = content
    .trim()
    .replace(/^```(?:text|tsv|csv)?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (cleaned.startsWith("{")) {
    return normalizePack(parseJsonFromModel(cleaned), topic);
  }

  const rows = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^категория\s+/i.test(line))
    .map((line) => {
      const tabParts = line.split("\t");
      if (tabParts.length >= 5) {
        return tabParts;
      }
      return line.split("|");
    })
    .filter((parts) => parts.length >= 5)
    .map((parts) => parts.map((part) => part.trim()))
    .filter((parts) => !/^вопрос$/i.test(parts[2]) && !/^ответ$/i.test(parts[3]));

  if (rows.length < 25) {
    throw new Error(`Ожидалось 25 строк вопросов, получено ${rows.length}.`);
  }

  const values = [100, 200, 300, 400, 500];
  const categories = [];
  const byTitle = new Map();

  rows.slice(0, 25).forEach((parts) => {
    const title = (parts[0] || `Категория ${categories.length + 1}`).replace(
      /^\s*\d+[\).:-]?\s*/,
      ""
    );
    const valueMatch = String(parts[1] || "").match(/\d+/);
    const value = valueMatch ? Number.parseInt(valueMatch[0], 10) : NaN;
    const question = parts[2];
    const answer = parts[3];
    const fact = parts.slice(4).join(" ");

    if (!question || !answer) {
      throw new Error("В каждой строке должны быть вопрос и ответ.");
    }

    if (!byTitle.has(title)) {
      if (categories.length >= 5) {
        return;
      }
      const category = { title: title.slice(0, 42), questions: [] };
      categories.push(category);
      byTitle.set(title, category);
    }

    const category = byTitle.get(title);
    if (category.questions.length < 5) {
      category.questions.push({
        value: values[category.questions.length] || value || 100,
        question,
        answer,
        fact
      });
    }
  });

  if (categories.length !== 5 || categories.some((category) => category.questions.length !== 5)) {
    throw new Error("Пакет должен содержать ровно 5 категорий по 5 вопросов.");
  }

  return normalizePack({ categories }, topic);
}

function parseJsonFromModel(content) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Не удалось найти JSON в ответе GigaChat.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function normalizePack(pack, topic) {
  if (!pack || !Array.isArray(pack.categories) || pack.categories.length < 5) {
    throw new Error("В пакете должно быть 5 категорий.");
  }

  const values = [100, 200, 300, 400, 500];
  const categories = pack.categories.slice(0, 5).map((category, categoryIndex) => {
    const questions = Array.isArray(category.questions) ? category.questions : [];
    if (questions.length < 5) {
      throw new Error(`В категории ${categoryIndex + 1} меньше 5 вопросов.`);
    }

    return {
      title: String(category.title || `Категория ${categoryIndex + 1}`).slice(0, 42),
      questions: questions.slice(0, 5).map((question, questionIndex) => ({
        id: `c${categoryIndex}-q${questionIndex}`,
        value: values[questionIndex],
        question: String(question.question || "").trim(),
        answer: String(question.answer || "").trim(),
        fact: String(question.fact || "").trim()
      }))
    };
  });

  categories.forEach((category) => {
    const demoPack = createDemoPack(topic);
    category.questions.forEach((question, questionIndex) => {
      if (!question.question || !question.answer) {
        throw new Error("Каждый вопрос должен содержать текст и ответ.");
      }
      applyJeopardyCapitalFix(question);
      const text = [question.question, question.answer, question.fact].join(" ");
      if (
        hasTooMuchLatin(text) ||
        isEnumerationQuestion(question.question) ||
        hasQuestionAnswerRootOverlap(question.question, [question.answer])
      ) {
        const replacement = findDemoJeopardyReplacement(demoPack, questionIndex);
        question.question = replacement.question;
        question.answer = replacement.answer;
        question.fact = replacement.fact;
      }
    });
  });

  return {
    title: topic && topic.trim() ? topic.trim() : "Своя игра",
    generatedAt: new Date().toISOString(),
    categories
  };
}

function isEnumerationQuestion(question) {
  const text = String(question || "").trim().toLowerCase();
  return /^(какие|каких|какими|назовите\s+несколько|перечислите|какие\s+два|какие\s+три|какие\s+из)/i.test(text);
}

function findDemoJeopardyReplacement(pack, questionIndex) {
  const candidates = pack.categories.flatMap((category) => category.questions);
  return (
    candidates.find(
      (question) =>
        question.value === (questionIndex + 1) * 100 &&
        !hasQuestionAnswerRootOverlap(question.question, [question.answer])
    ) ||
    candidates.find((question) => !hasQuestionAnswerRootOverlap(question.question, [question.answer])) ||
    candidates[questionIndex] ||
    candidates[0]
  );
}

function hasQuestionAnswerRootOverlap(question, answers) {
  const questionStems = extractMeaningfulStems(question);
  return answers.some((answer) =>
    Array.from(extractMeaningfulStems(answer)).some((stem) => questionStems.has(stem))
  );
}

function extractMeaningfulStems(text) {
  const stopwords = new Set([
    "какой",
    "какая",
    "какое",
    "какие",
    "каких",
    "какими",
    "кто",
    "что",
    "где",
    "когда",
    "как",
    "куда",
    "откуда",
    "почему",
    "зачем",
    "этот",
    "эта",
    "это",
    "эти",
    "его",
    "для",
    "при",
    "под",
    "над",
    "между",
    "через",
    "после",
    "перед",
    "или",
    "без",
    "был",
    "была",
    "было",
    "были",
    "стал",
    "стала",
    "стало",
    "стали",
    "называется",
    "называют",
    "считается",
    "является"
  ]);

  return new Set(
    (String(text || "").toLowerCase().replace(/ё/g, "е").match(/[а-яе]{4,}/gi) || [])
      .filter((word) => !stopwords.has(word))
      .map((word) => normalizeRussianStem(word))
      .filter((stem) => stem.length >= 4 && !stopwords.has(stem))
  );
}

function normalizeRussianStem(word) {
  const stem = String(word || "").replace(
    /(иями|ями|ами|ого|его|ому|ему|ыми|ими|ией|иям|ием|иях|ая|яя|ое|ее|ые|ие|ый|ий|ой|ей|ам|ям|ах|ях|ов|ев|ом|ем|ую|юю|а|я|ы|и|о|е|у|ю)$/i,
    ""
  );
  return stem.length >= 4 ? stem : word;
}

function applyJeopardyCapitalFix(question) {
  const text = String(question.question || "").toLowerCase();
  if (!/(столиц|главн.*город)/i.test(text)) {
    return;
  }

  const fix = CAPITAL_FIXES.find((item) => text.includes(item.country));
  if (!fix) {
    return;
  }

  question.answer = fix.capital;
  question.fact = `${fix.capital} - столица этой страны.`;
}

function createDemoPack(topic) {
  const title = topic && topic.trim() ? topic.trim() : "Демо-пакет";
  const categoryTitles = ["История", "Наука", "Кино", "География", "Литература"];
  const questions = [
    [
      ["Кто был первым президентом США?", "Джордж Вашингтон", "Он вступил в должность в 1789 году."],
      ["Как назывался корабль экспедиции Магеллана, завершивший первое кругосветное плавание?", "Виктория", "Сам Магеллан не дожил до конца экспедиции."],
      ["В каком году началась Первая мировая война?", "1914", "Поводом стало убийство эрцгерцога Франца Фердинанда."],
      ["Какой город был столицей Византийской империи?", "Константинополь", "Сейчас это Стамбул."],
      ["Какой договор завершил Тридцатилетнюю войну?", "Вестфальский мир", "Он был заключен в 1648 году."]
    ],
    [
      ["Какая планета ближе всего к Солнцу?", "Меркурий", "У Меркурия самый короткий год в Солнечной системе."],
      ["Какой газ растения поглощают при фотосинтезе?", "Углекислый газ", "В процессе выделяется кислород."],
      ["Как называется частица с отрицательным электрическим зарядом?", "Электрон", "Электрон входит в состав атомов."],
      ["Кто сформулировал закон всемирного тяготения?", "Исаак Ньютон", "Закон опубликован в «Математических началах натуральной философии»."],
      ["Как называется шкала кислотности растворов?", "pH", "Нейтральная вода имеет pH около 7."]
    ],
    [
      ["Какой волшебник учился в Хогвартсе?", "Гарри Поттер", "Персонаж создан Джоан Роулинг."],
      ["Кто снял фильм «Титаник» 1997 года?", "Джеймс Кэмерон", "Фильм получил 11 премий «Оскар»."],
      ["Как называется родная планета Супермена?", "Криптон", "На Земле его зовут Кларк Кент."],
      ["Какой режиссер снял «Сталкера»?", "Андрей Тарковский", "Фильм вышел в 1979 году."],
      ["Какой фильм Акиры Куросавы вдохновил «Великолепную семерку»?", "Семь самураев", "Картина вышла в 1954 году."]
    ],
    [
      ["Какая страна занимает целый материк?", "Австралия", "Это также название континента."],
      ["Какая река самая длинная в Европе?", "Волга", "Она впадает в Каспийское море."],
      ["Столица Канады?", "Оттава", "Город находится в провинции Онтарио."],
      ["Что отделяет Африку от Европы у Испании?", "Гибралтарский пролив", "Он соединяет Атлантику и Средиземное море."],
      ["Какая пустыня считается самой сухой неполярной пустыней?", "Атакама", "Она находится в Южной Америке."]
    ],
    [
      ["Кто написал «Евгения Онегина»?", "Александр Пушкин", "Роман написан в стихах."],
      ["Как зовут автора «Мастера и Маргариты»?", "Михаил Булгаков", "Роман был опубликован после смерти автора."],
      ["В каком произведении есть персонаж Родион Раскольников?", "Преступление и наказание", "Автор романа - Федор Достоевский."],
      ["Кто написал роман «Сто лет одиночества»?", "Габриэль Гарсиа Маркес", "Это одно из главных произведений магического реализма."],
      ["Какой писатель создал Шерлока Холмса?", "Артур Конан Дойл", "Первый рассказ о Холмсе вышел в 1887 году."]
    ]
  ];

  return {
    title,
    generatedAt: new Date().toISOString(),
    categories: categoryTitles.map((categoryTitle, categoryIndex) => ({
      title: categoryTitle,
      questions: questions[categoryIndex].map(([question, answer, fact], questionIndex) => ({
        id: `c${categoryIndex}-q${questionIndex}`,
        value: (questionIndex + 1) * 100,
        question,
        answer,
        fact
      }))
    }))
  };
}

const MILLIONAIRE_PRIZES = [
  500, 1000, 2000, 3000, 5000,
  10000, 15000, 25000, 50000, 100000,
  200000, 400000, 800000, 1500000, 3000000
];

const CAPITAL_FIXES = [
  { country: "швеци", capital: "Стокгольм" },
  { country: "норвеги", capital: "Осло" },
  { country: "финлянди", capital: "Хельсинки" },
  { country: "дани", capital: "Копенгаген" },
  { country: "исланди", capital: "Рейкьявик" },
  { country: "франци", capital: "Париж" },
  { country: "германи", capital: "Берлин" },
  { country: "италии", capital: "Рим" },
  { country: "испан", capital: "Мадрид" },
  { country: "португали", capital: "Лиссабон" },
  { country: "япони", capital: "Токио" },
  { country: "кита", capital: "Пекин" },
  { country: "канад", capital: "Оттава" },
  { country: "австрали", capital: "Канберра" }
];

function buildMillionairePrompt(topic) {
  const safeTopic = topic && topic.trim()
    ? topic.trim()
    : "разнообразная общая эрудиция: история, наука, культура, география, искусство, спорт, литература";
  return [
    "Сгенерируй вопросы для русскоязычной игры «Кто хочет стать миллионером?».",
    `Тема: ${safeTopic}.`,
    "Нужно ровно 15 вопросов. Сложность должна расти от 1 к 15.",
    "У каждого вопроса должно быть ровно 4 варианта ответа.",
    "Все вопросы, варианты ответа и справки должны быть на русском языке.",
    "Не используй английские слова, транслитерацию и латиницу, кроме общепринятых символов вроде pH, DNA, HTML.",
    "Варианты ответа не должны повторять слова из вопроса и не должны содержать однокоренные слова из текста вопроса.",
    "Правильный вариант должен быть указан только буквой A, B, C или D.",
    "Верни только 15 строк без markdown, заголовков, нумерации и пояснений.",
    "Формат строки:",
    "Вопрос|Вариант A|Вариант B|Вариант C|Вариант D|Буква правильного варианта|Короткая справка",
    "Не используй вертикальную черту внутри полей."
  ].join("\n");
}

async function generateMillionaireWithGigaChat(topic) {
  const token = await getAccessToken();
  const content = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты редактор телевизионных интеллектуальных игр. Пишешь точные вопросы и строго соблюдаешь формат строк."
      },
      {
        role: "user",
        content: buildMillionairePrompt(topic)
      }
    ],
    0.68
  );

  let pack = null;
  try {
    pack = parseMillionaireFromLines(content, topic);
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, "last-millionaire-response.txt"), content, "utf8");
    throw error;
  }

  return verifyMillionairePackWithGigaChat(token, pack, topic);
}

function parseMillionaireFromLines(content, topic) {
  const cleanedLines = content
    .trim()
    .replace(/^```(?:text|csv|tsv)?/i, "")
    .replace(/```$/i, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\s*\d+[\).:-]\s*/, ""));

  const rows = [];
  for (let index = 0; index < cleanedLines.length; index += 1) {
    const line = cleanedLines[index];
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length >= 7) {
      rows.push(parts);
      continue;
    }

    const next = cleanedLines[index + 1];
    if (next && !line.includes("|") && next.includes("|")) {
      const nextParts = next.split("|").map((part) => part.trim());
      if (nextParts.length >= 6) {
        rows.push([line, ...nextParts]);
        index += 1;
      }
    }
  }

  const blockRows = parseMillionaireBlocks(content);
  const validRows = [...rows, ...blockRows]
    .filter((parts) => parts.length >= 7)
    .filter((parts) => !/^вопрос$/i.test(parts[0]));

  if (validRows.length < 15) {
    createDemoMillionaire(topic).questions.forEach((question) => {
      validRows.push([
        question.question,
        ...question.options,
        String(question.correctIndex),
        question.fact
      ]);
    });
  }

  const questions = validRows.slice(0, 15).map((parts, index) => {
    const correctIndex = normalizeCorrectIndex(parts[5]);
    const question = {
      id: `m-q${index}`,
      level: index + 1,
      prize: MILLIONAIRE_PRIZES[index],
      question: parts[0],
      options: parts.slice(1, 5),
      correctIndex,
      fact: parts.slice(6).join(" ")
    };
    applyCapitalFix(question);
    return question;
  });

  const russianDemo = createDemoMillionaire(topic).questions;
  questions.forEach((question, index) => {
    const text = [question.question, ...question.options, question.fact].join(" ");
    if (hasTooMuchLatin(text) || hasQuestionAnswerRootOverlap(question.question, question.options)) {
      const replacement = findDemoMillionaireReplacement(russianDemo, index);
      question.question = replacement.question;
      question.options = replacement.options;
      question.correctIndex = replacement.correctIndex;
      question.fact = replacement.fact;
    }
  });

  questions.forEach((question) => {
    if (!question.question || question.options.length !== 4 || question.options.some((option) => !option)) {
      throw new Error("Каждый вопрос Миллионера должен содержать текст и 4 варианта.");
    }
  });

  return {
    title: topic && topic.trim() ? topic.trim() : "Кто хочет стать миллионером?",
    generatedAt: new Date().toISOString(),
    prizes: MILLIONAIRE_PRIZES,
    questions
  };
}

async function verifyMillionairePackWithGigaChat(token, pack, topic) {
  const serialized = pack.questions
    .map((question) =>
      [
        question.question,
        question.options[0],
        question.options[1],
        question.options[2],
        question.options[3],
        ["A", "B", "C", "D"][question.correctIndex],
        question.fact || ""
      ].join("|")
    )
    .join("\n");

  const checked = await requestChatCompletion(
    token,
    [
      {
        role: "system",
        content:
          "Ты строгий фактчекер игры «Кто хочет стать миллионером?». Проверяешь, что правильная буква действительно указывает на верный вариант. Сомнительные вопросы заменяешь."
      },
      {
        role: "user",
        content: [
          "Проверь 15 вопросов.",
          "У каждого вопроса должен быть ровно один фактически верный ответ.",
          "Если правильная буква неверна, исправь букву. Если среди вариантов нет верного ответа, замени варианты или весь вопрос.",
          "Все вопросы, варианты и справки должны быть только на русском языке.",
          "Варианты ответа не должны повторять слова из вопроса и не должны содержать однокоренные слова из текста вопроса.",
          "Правильный вариант указывай только буквой A, B, C или D.",
          "Верни ровно 15 строк без markdown, заголовков, нумерации и пояснений.",
          "Формат строки:",
          "Вопрос|Вариант A|Вариант B|Вариант C|Вариант D|Буква правильного варианта|Короткая справка",
          "Не используй вертикальную черту внутри полей.",
          `Тема: ${topic && topic.trim() ? topic.trim() : "разнообразная общая эрудиция"}`,
          serialized
        ].join("\n\n")
      }
    ],
    0.1
  );

  try {
    return parseMillionaireFromLines(checked, topic);
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, "last-millionaire-verified.txt"), checked, "utf8");
    return pack;
  }
}

function hasTooMuchLatin(text) {
  const latinWords = String(text || "").match(/[A-Za-z]{3,}/g) || [];
  const allowed = new Set(["DNA", "HTML", "HTTP", "CSS", "USB", "WiFi", "pH"]);
  return latinWords.filter((word) => !allowed.has(word)).length >= 2;
}

function findDemoMillionaireReplacement(questions, index) {
  return (
    questions.find(
      (question) =>
        question.level === index + 1 &&
        !hasQuestionAnswerRootOverlap(question.question, question.options)
    ) ||
    questions.find((question) => !hasQuestionAnswerRootOverlap(question.question, question.options)) ||
    questions[index] ||
    questions[0]
  );
}

function parseMillionaireBlocks(content) {
  return content
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .map((lines) => {
      if (!lines.length) {
        return null;
      }

      const question = lines[0].replace(/^\s*\d+[\).:-]\s*/, "");
      const options = [];
      let lastOptionIndex = -1;

      lines.forEach((line, index) => {
        const option = parseOptionLine(line);
        if (option && options.length < 4) {
          options.push(option.text);
          lastOptionIndex = index;
        }
      });

      if (options.length < 4) {
        return null;
      }

      const tail = lines.slice(lastOptionIndex + 1);
      const correctLineIndex = tail.findIndex((line) => /^[0-3ABCDАБВГД]$/i.test(line.trim()));
      const correctRaw = correctLineIndex === -1 ? "0" : tail[correctLineIndex].trim();
      const fact = correctLineIndex === -1 ? tail.join(" ") : tail.slice(correctLineIndex + 1).join(" ");

      return [question, ...options.slice(0, 4), correctRaw, fact];
    })
    .filter(Boolean);
}

function parseOptionLine(line) {
  const match = String(line || "").trim().match(/^([0-3ABCDАБВГД])\s*[\).:–-]\s*(.+)$/i);
  if (!match) {
    return null;
  }
  return {
    label: match[1],
    text: match[2].trim()
  };
}

function normalizeCorrectIndex(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const letterIndex = ["A", "B", "C", "D", "А", "Б", "В", "Г"].indexOf(normalized[0]);
  if (letterIndex !== -1) {
    return letterIndex % 4;
  }
  if (/^[1-4]$/.test(normalized)) {
    return Number(normalized) - 1;
  }
  if (/^0$/.test(normalized)) {
    return 0;
  }
  return 0;
}

function applyCapitalFix(question) {
  const text = String(question.question || "").toLowerCase();
  if (!/(столиц|главн.*город)/i.test(text)) {
    return;
  }

  const fix = CAPITAL_FIXES.find((item) => text.includes(item.country));
  if (!fix) {
    return;
  }

  const capitalIndex = question.options.findIndex(
    (option) => String(option || "").trim().toLowerCase() === fix.capital.toLowerCase()
  );

  if (capitalIndex !== -1) {
    question.correctIndex = capitalIndex;
    question.fact = `${fix.capital} - столица этой страны.`;
    return;
  }

  question.options[question.correctIndex] = fix.capital;
  question.fact = `${fix.capital} - столица этой страны.`;
}

function createDemoMillionaire(topic) {
  const title = topic && topic.trim() ? topic.trim() : "Демо: Миллионер";
  const base = [
    ["Какой цвет получится при смешении синего и желтого?", ["Зеленый", "Красный", "Фиолетовый", "Оранжевый"], 0, "Синий и желтый дают зеленый."],
    ["Сколько дней обычно в високосном году?", ["365", "366", "364", "360"], 1, "В високосном году добавляется 29 февраля."],
    ["Какая планета известна как Красная планета?", ["Венера", "Марс", "Юпитер", "Меркурий"], 1, "Марс кажется красным из-за оксидов железа."],
    ["Кто написал роман «Война и мир»?", ["Лев Толстой", "Федор Достоевский", "Антон Чехов", "Иван Тургенев"], 0, "Роман опубликован в XIX веке."],
    ["Как называется столица Японии?", ["Киото", "Осака", "Токио", "Нара"], 2, "Токио стал столицей в эпоху Мэйдзи."],
    ["Какой океан самый большой?", ["Индийский", "Атлантический", "Северный Ледовитый", "Тихий"], 3, "Тихий океан занимает около трети поверхности Земли."],
    ["Какой химический символ у золота?", ["Ag", "Au", "Fe", "Cu"], 1, "Au происходит от латинского aurum."],
    ["Кто сформулировал законы движения и тяготения?", ["Ньютон", "Эйнштейн", "Галилей", "Кеплер"], 0, "Исаак Ньютон опубликовал их в 1687 году."],
    ["Какой город называют Вечным городом?", ["Афины", "Париж", "Рим", "Прага"], 2, "Такое прозвище закрепилось за Римом."],
    ["Что измеряет барометр?", ["Давление воздуха", "Температуру", "Скорость ветра", "Влажность"], 0, "Барометр используют в метеорологии."],
    ["Кто написал музыку к балету «Лебединое озеро»?", ["Прокофьев", "Чайковский", "Рахманинов", "Глинка"], 1, "Балет впервые поставили в 1877 году."],
    ["Как называется самая длинная кость человека?", ["Плечевая", "Большеберцовая", "Бедренная", "Лучевая"], 2, "Бедренная кость находится в бедре."],
    ["Какой ученый предложил периодическую систему элементов?", ["Менделеев", "Ломоносов", "Бор", "Кюри"], 0, "Дмитрий Менделеев представил таблицу в 1869 году."],
    ["Какой пролив разделяет Европу и Африку у Испании?", ["Босфор", "Гибралтарский", "Магелланов", "Беринг"], 1, "Гибралтарский пролив соединяет Атлантику и Средиземное море."],
    ["Какой термин означает изменение наследственных признаков популяций со временем?", ["Эволюция", "Индукция", "Диффузия", "Рефракция"], 0, "Эволюция лежит в основе современной биологии."]
  ];

  return {
    title,
    generatedAt: new Date().toISOString(),
    prizes: MILLIONAIRE_PRIZES,
    questions: base.map(([question, options, correctIndex, fact], index) => ({
      id: `m-q${index}`,
      level: index + 1,
      prize: MILLIONAIRE_PRIZES[index],
      question,
      options,
      correctIndex,
      fact
    }))
  };
}

function serveStatic(req, res) {
  const rawPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const requestedPath = rawPath === "/" ? "/index.html" : rawPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
        res.end(fallbackContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/status" && req.method === "GET") {
    sendJson(res, 200, {
      configured: Boolean(getAuthKey()),
      model: GIGACHAT_MODEL,
      scope: GIGACHAT_SCOPE,
      ignoreTls: IGNORE_TLS
    });
    return;
  }

  if (url.pathname === "/api/generate" && req.method === "POST") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const topic = String(body.topic || "").slice(0, 120);

      if (!getAuthKey()) {
        sendJson(res, 200, {
          source: "demo",
          warning:
            "Ключ GigaChat не настроен, поэтому запущен демо-пакет. Добавьте GIGACHAT_AUTH_KEY и перезапустите сервер.",
          pack: createDemoPack(topic)
        });
        return;
      }

      const pack = await generateWithGigaChat(topic);
      sendJson(res, 200, { source: "gigachat", pack });
    } catch (error) {
      sendJson(res, 500, {
        error: error.message,
        source: "error",
        pack: createDemoPack("Резервный демо-пакет")
      });
    }
    return;
  }

  if (url.pathname === "/api/generate-final" && req.method === "POST") {
    try {
      if (!getAuthKey()) {
        sendJson(res, 200, {
          source: "demo",
          question: createDemoFinalQuestion()
        });
        return;
      }

      const question = await generateFinalQuestionWithGigaChat();
      sendJson(res, 200, { source: "gigachat", question });
    } catch (error) {
      sendJson(res, 500, {
        error: error.message,
        source: "error",
        question: createDemoFinalQuestion()
      });
    }
    return;
  }

  if (url.pathname === "/api/generate-millionaire" && req.method === "POST") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const topic = String(body.topic || "").slice(0, 120);

      if (!getAuthKey()) {
        sendJson(res, 200, {
          source: "demo",
          warning: "Ключ GigaChat не настроен, поэтому запущен демо-пакет.",
          pack: createDemoMillionaire(topic)
        });
        return;
      }

      const pack = await generateMillionaireWithGigaChat(topic);
      sendJson(res, 200, { source: "gigachat", pack });
    } catch (error) {
      sendJson(res, 500, {
        error: error.message,
        source: "error",
        pack: createDemoMillionaire("Резервный демо-пакет")
      });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Своя игра запущена: http://localhost:${PORT}`);
  console.log(
    getAuthKey()
      ? `GigaChat: ${GIGACHAT_MODEL}, scope ${GIGACHAT_SCOPE}`
      : "GigaChat: ключ не настроен, будет доступен демо-пакет."
  );
});
