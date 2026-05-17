#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const PORT = process.env.PORT || "5173";
const APP_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, "FearlessGame")
  : path.join(os.homedir(), ".fearlessgame");
const ENV_FILE = path.join(APP_DIR, ".env");
const URL = `http://localhost:${PORT}`;

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function ensureEnvFile() {
  fs.mkdirSync(APP_DIR, { recursive: true });

  if (fs.existsSync(ENV_FILE)) {
    return;
  }

  console.log("FearlessGame: первый запуск.");
  console.log("Можно нажать Enter и играть в демо-режиме без GigaChat.");
  console.log("Если есть ключи GigaChat, вставьте их сейчас. Они сохранятся только на этом компьютере.");
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const authKey = await ask(rl, "GigaChat Authorization Key (или Enter, если его нет): ");
  let clientId = "";
  let clientSecret = "";

  if (!authKey) {
    clientId = await ask(rl, "GigaChat Client ID (или Enter для демо): ");
    if (clientId) {
      clientSecret = await ask(rl, "GigaChat Client Secret / ключ: ");
    }
  }

  rl.close();

  const content = [
    `GIGACHAT_CLIENT_ID=${clientId}`,
    `GIGACHAT_CLIENT_SECRET=${clientSecret}`,
    `GIGACHAT_AUTH_KEY=${authKey}`,
    "GIGACHAT_IGNORE_TLS=true"
  ].join("\n");

  fs.writeFileSync(ENV_FILE, `${content}\n`, "utf8");
}

function openBrowser(url) {
  const commands = {
    win32: ["cmd", ["/c", "start", "", url]],
    darwin: ["open", [url]],
    linux: ["xdg-open", [url]]
  };
  const command = commands[process.platform];

  if (!command) {
    console.log(`Откройте в браузере: ${url}`);
    return;
  }

  try {
    const child = spawn(command[0], command[1], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
  } catch (error) {
    console.log(`Откройте в браузере: ${url}`);
  }
}

async function main() {
  await ensureEnvFile();

  process.env.PORT = PORT;
  process.env.FEARLESSGAME_ENV_FILE = ENV_FILE;

  console.log("");
  console.log(`FearlessGame запускается: ${URL}`);
  console.log("Это окно закрывать нельзя, пока идет игра.");
  console.log("");

  setTimeout(() => openBrowser(URL), 1200);
  require("../server");
}

main().catch((error) => {
  console.error(`Не удалось запустить FearlessGame: ${error.message}`);
  process.exit(1);
});
