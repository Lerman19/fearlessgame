# FearlessGame

Неоновая викторина для ведущего в браузере: «Своя игра» и «Кто хочет стать миллионером?». Вопросы генерируются через GigaChat, счет и ход игры ведутся автоматически.

VS Code, Git и навыки программирования не нужны. Нужно только установить Node.js.

Проект на GitHub:

```text
https://github.com/Lerman19/fearlessgame
```

## Быстрый Запуск

### 1. Установить Node.js

Откройте сайт:

```text
https://nodejs.org/en/download
```

Скачайте и установите LTS-версию:

- Windows: `Windows Installer (.msi)`
- macOS: установщик `.pkg`

После установки закройте и заново откройте PowerShell или Terminal.

### 2. Проверить установку

Windows:

1. Нажмите `Win + R`.
2. Введите `powershell`.
3. Нажмите `Enter`.
4. Вставьте:

```powershell
node -v
```

macOS:

1. Откройте `Terminal` через `Cmd + Space`.
2. Вставьте:

```bash
node -v
```

Если появилась версия вроде `v22.13.1`, все готово.

### 3. Запустить игру без скачивания проекта

Windows, PowerShell:

```powershell
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

macOS, Terminal:

```bash
npx --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

При первом запуске программа спросит ключи GigaChat. Если ключей нет, просто нажимайте `Enter` - игра запустится в демо-режиме.

Браузер откроется сам. Если не открылся, зайдите вручную:

```text
http://localhost:5173
```

Важно: PowerShell или Terminal не закрывайте, пока идет игра.

## Как Играть

1. Откройте `http://localhost:5173`.
2. Выберите игру на главном экране.
3. Введите имена участников.
4. Нажмите `Сгенерировать и начать`.
5. Ведущий отмечает правильные и неправильные ответы, очки начисляются автоматически.

## Если Нужно Скачать Проект Вручную

Этот вариант нужен только если не хотите запускать через `npx`.

1. Откройте GitHub:

```text
https://github.com/Lerman19/fearlessgame
```

2. Нажмите зеленую кнопку `Code`.
3. Нажмите `Download ZIP`.
4. Откройте папку `Загрузки` или `Downloads`.
5. Найдите `fearlessgame-main.zip`.
6. Распакуйте архив.
7. Откройте папку `fearlessgame-main`.

Внутри должны быть `server.js`, `package.json`, `README.md` и папка `public`.

### Настроить GigaChat

В папке `fearlessgame-main` создайте файл `.env`.

Если есть `Client ID` и `Client Secret`, вставьте:

```dotenv
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_client_secret
GIGACHAT_AUTH_KEY=
GIGACHAT_IGNORE_TLS=true
```

Если есть готовый `Authorization Key`, вставьте:

```dotenv
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=ваш_authorization_key
GIGACHAT_IGNORE_TLS=true
```

Если ключей нет, оставьте значения пустыми - будет демо-режим.

### Запустить Из Папки

Windows:

1. Откройте папку `fearlessgame-main`.
2. Кликните правой кнопкой мыши по пустому месту.
3. Выберите `Открыть в терминале` или `Открыть окно PowerShell здесь`.
4. Введите:

```powershell
node server.js
```

macOS:

1. Откройте `Terminal`.
2. Введите `cd ` с пробелом.
3. Перетащите папку `fearlessgame-main` в окно Terminal.
4. Нажмите `Enter`.
5. Введите:

```bash
node server.js
```

После запуска откройте:

```text
http://localhost:5173
```

## Если Что-то Не Работает

`node` не найден:

Установите Node.js LTS и заново откройте PowerShell или Terminal.

`npx` заблокирован на Windows:

Используйте команду именно с `npx.cmd`:

```powershell
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

Сайт не открывается:

Проверьте, что окно PowerShell или Terminal не закрыто, затем откройте `http://localhost:5173`.

GigaChat не настроен:

Проверьте ключи в `.env`. Должен быть заполнен либо `GIGACHAT_AUTH_KEY`, либо пара `GIGACHAT_CLIENT_ID` и `GIGACHAT_CLIENT_SECRET`.

Ошибка `429`:

Это лимит GigaChat. Подождите 1-2 минуты и попробуйте снова.

## Что Отправить Другому Человеку

```text
1. Установи Node.js LTS: https://nodejs.org/en/download

2. Windows:
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz

3. Mac:
npx --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz

4. Когда откроется браузер, играй на http://localhost:5173

Окно PowerShell или Terminal не закрывай, пока идет игра.
```
