# FearlessGame

Темная неоновая викторина для ведущего с двумя режимами: «Своя игра» и «Кто хочет стать миллионером?». GigaChat генерирует вопросы, а приложение ведет счет и игровые состояния в браузере.

Игра запускается как обычный сайт в браузере, но рядом работает маленький локальный сервер на Node.js. VS Code, Git и навыки программирования не нужны.

GitHub проекта:

```text
https://github.com/Lerman19/fearlessgame
```

## Самый простой вариант

Этот способ не требует скачивать проект вручную. Человек устанавливает Node.js, вставляет одну команду, и игра сама открывается в браузере.

При первом запуске программа спросит ключи GigaChat. Если ключей нет, можно просто нажимать `Enter` - игра откроется в демо-режиме.

Ключи сохраняются только на компьютере игрока:

- Windows: `%APPDATA%\FearlessGame\.env`
- macOS: `~/.fearlessgame/.env`

В GitHub ключи не отправляются.

## Windows: запуск без скачивания проекта

### 1. Установить Node.js

1. Откройте сайт:

```text
https://nodejs.org/en/download
```

2. Скачайте `Windows Installer (.msi)` для версии LTS.
3. Запустите установщик.
4. В установщике можно нажимать `Next`, ничего специально менять не нужно.
5. После установки закройте все окна PowerShell, если они были открыты.

### 2. Проверить Node.js

1. Нажмите `Win + R`.
2. Введите `powershell`.
3. Нажмите `Enter`.
4. Вставьте команду:

```powershell
node -v
```

Если появилась версия вроде `v24.15.0` или `v22.13.1`, значит все нормально.

### 3. Запустить FearlessGame

В том же окне PowerShell вставьте:

```powershell
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

При первом запуске:

1. Если есть `GigaChat Authorization Key`, вставьте его и нажмите `Enter`.
2. Если такого ключа нет, нажмите `Enter`.
3. Потом можно вставить `Client ID` и `Client Secret`.
4. Если ключей вообще нет, просто нажимайте `Enter` - запустится демо-режим.

Браузер должен открыться сам. Если не открылся, откройте вручную:

```text
http://localhost:5173
```

Важно: окно PowerShell закрывать нельзя, пока идет игра. Если закрыть окно, игра остановится.

## macOS: запуск без скачивания проекта

### 1. Установить Node.js

1. Откройте сайт:

```text
https://nodejs.org/en/download
```

2. Скачайте установщик для macOS, обычно это файл `.pkg` версии LTS.
3. Откройте скачанный `.pkg`.
4. Пройдите установку как обычную программу.
5. После установки закройте Terminal, если он был открыт.

### 2. Проверить Node.js

1. Откройте `Terminal`.
   Его можно найти через `Spotlight`: нажмите `Cmd + Space`, введите `Terminal`, нажмите `Enter`.
2. Вставьте команду:

```bash
node -v
```

Если появилась версия вроде `v24.15.0` или `v22.13.1`, значит все нормально.

### 3. Запустить FearlessGame

В Terminal вставьте:

```bash
npx --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

При первом запуске:

1. Если есть `GigaChat Authorization Key`, вставьте его и нажмите `Enter`.
2. Если такого ключа нет, нажмите `Enter`.
3. Потом можно вставить `Client ID` и `Client Secret`.
4. Если ключей вообще нет, просто нажимайте `Enter` - запустится демо-режим.

Браузер должен открыться сам. Если не открылся, откройте вручную:

```text
http://localhost:5173
```

Важно: окно Terminal закрывать нельзя, пока идет игра. Если закрыть окно, игра остановится.

## Как играть

1. Откройте `http://localhost:5173`.
2. На главном экране выберите игру.
3. Для «Своей игры» введите имена участников.
4. Для «Кто хочет стать миллионером?» введите имя игрока.
5. Нажмите `Сгенерировать и начать`.
6. Игра сама покажет поле, варианты ответов, подсказки и счет.

## Как запустить из скачанной папки

Этот вариант нужен, если человек хочет скачать ZIP с GitHub и запускать проект из папки.

Общая логика такая:

1. Зайти на страницу проекта на GitHub.
2. Скачать архив ZIP.
3. Распаковать архив.
4. Открыть распакованную папку.
5. Создать файл `.env` с ключами GigaChat или оставить демо-режим.
6. Запустить `node server.js`.
7. Открыть `http://localhost:5173` в браузере.

### Windows

1. Откройте браузер: Chrome, Edge, Firefox или любой другой.
2. В адресную строку вставьте ссылку на проект:

```text
https://github.com/Lerman19/fearlessgame
```

3. Нажмите `Enter`.
4. На странице GitHub найдите зеленую кнопку `Code`.
   Она находится справа над списком файлов проекта.
5. Нажмите `Code`.
6. В открывшемся меню нажмите `Download ZIP`.
7. Дождитесь скачивания файла.
   Обычно он попадет в папку `Загрузки` или `Downloads`.
8. Откройте папку `Загрузки`.
9. Найдите файл примерно с таким названием:

```text
fearlessgame-main.zip
```

10. Кликните по архиву правой кнопкой мыши.
11. Выберите `Извлечь все...` или `Extract All...`.
12. Нажмите `Извлечь`.
13. Откройте распакованную папку.
    Обычно она называется:

```text
fearlessgame-main
```

14. Внутри должны быть файлы `server.js`, `README.md`, `package.json` и папка `public`.
15. Создайте в этой папке файл `.env`.

Если Windows не дает создать файл с именем `.env` через обычное меню:

1. Откройте `Блокнот`.
2. Вставьте настройки из примера ниже.
3. Нажмите `Файл` -> `Сохранить как`.
4. В поле `Имя файла` введите:

```text
.env
```

5. В поле `Тип файла` выберите `Все файлы`.
6. Сохраните файл прямо в папку `fearlessgame-main`.

Вставьте в `.env`:

```dotenv
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_ключ_или_client_secret
GIGACHAT_AUTH_KEY=
GIGACHAT_IGNORE_TLS=true
```

Если есть готовый `Authorization Key`, можно так:

```dotenv
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=ваш_authorization_key
GIGACHAT_IGNORE_TLS=true
```

Если ключей GigaChat нет, можно оставить значения пустыми. Тогда игра запустится в демо-режиме:

```dotenv
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=
GIGACHAT_IGNORE_TLS=true
```

16. В папке `fearlessgame-main` кликните правой кнопкой мыши по пустому месту.
17. Выберите `Открыть в терминале` или `Открыть окно PowerShell здесь`.
18. Введите:

```powershell
node server.js
```

19. Откройте в браузере:

```text
http://localhost:5173
```

Окно PowerShell не закрывайте, пока идет игра.

### macOS

1. Откройте браузер: Safari, Chrome, Firefox или любой другой.
2. В адресную строку вставьте ссылку на проект:

```text
https://github.com/Lerman19/fearlessgame
```

3. Нажмите `Enter`.
4. На странице GitHub найдите зеленую кнопку `Code`.
   Она находится справа над списком файлов проекта.
5. Нажмите `Code`.
6. В открывшемся меню нажмите `Download ZIP`.
7. Дождитесь скачивания файла.
   Обычно он попадет в папку `Downloads` или `Загрузки`.
8. Откройте папку `Downloads`.
9. Найдите файл примерно с таким названием:

```text
fearlessgame-main.zip
```

10. Дважды кликните по архиву.
11. Рядом появится распакованная папка:

```text
fearlessgame-main
```

12. Откройте эту папку.
13. Внутри должны быть файлы `server.js`, `README.md`, `package.json` и папка `public`.
14. Создайте файл `.env` в папке `fearlessgame-main`.

Самый простой способ создать `.env` на Mac:

1. Откройте `TextEdit`.
2. В меню выберите `Format` -> `Make Plain Text`.
3. Вставьте настройки из примера ниже.
4. Нажмите `File` -> `Save`.
5. В поле имени файла напишите:

```text
.env
```

6. Сохраните файл в папку `fearlessgame-main`.

Вставьте в `.env`:

```dotenv
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_ключ_или_client_secret
GIGACHAT_AUTH_KEY=
GIGACHAT_IGNORE_TLS=true
```

Если есть готовый `Authorization Key`, можно так:

```dotenv
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=ваш_authorization_key
GIGACHAT_IGNORE_TLS=true
```

Если ключей GigaChat нет, можно оставить значения пустыми. Тогда игра запустится в демо-режиме:

```dotenv
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=
GIGACHAT_IGNORE_TLS=true
```

15. Откройте `Terminal`.
16. Введите `cd ` с пробелом в конце.
17. Перетащите папку `fearlessgame-main` в окно Terminal.
    Путь подставится сам.
18. Нажмите `Enter`.

Пример:

```bash
cd /Users/name/Downloads/fearlessgame-main
```

19. В Terminal запустите:

```bash
node server.js
```

20. Откройте в браузере:

```text
http://localhost:5173
```

Окно Terminal не закрывайте, пока идет игра.

## Если нужно поменять ключи GigaChat

При запуске через `npx` ключи спрашиваются только в первый раз.

На Windows файл с ключами лежит здесь:

```text
%APPDATA%\FearlessGame\.env
```

Быстро открыть папку можно так:

1. Нажмите `Win + R`.
2. Вставьте:

```text
%APPDATA%\FearlessGame
```

3. Нажмите `Enter`.
4. Откройте `.env` Блокнотом и поменяйте ключи.

На macOS файл лежит здесь:

```text
~/.fearlessgame/.env
```

Открыть его через Terminal можно командой:

```bash
open ~/.fearlessgame
```

## Если что-то не работает

`node` не распознается как команда на Windows:

Установите Node.js LTS с `https://nodejs.org/en/download`, затем закройте и заново откройте PowerShell.

`npx` заблокирован на Windows:

Используйте именно эту команду:

```powershell
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz
```

На macOS команда `node -v` не работает:

Установите Node.js LTS через `.pkg` с официального сайта, затем закройте и заново откройте Terminal.

Сайт не открывается:

Проверьте, что окно PowerShell или Terminal не закрыто. Адрес должен быть именно:

```text
http://localhost:5173
```

Игра пишет, что GigaChat не настроен:

Проверьте файл `.env`. В нем должен быть заполнен либо `GIGACHAT_AUTH_KEY`, либо пара `GIGACHAT_CLIENT_ID` и `GIGACHAT_CLIENT_SECRET`.

Ошибка сертификата GigaChat:

Оставьте в `.env` строку:

```dotenv
GIGACHAT_IGNORE_TLS=true
```

Ошибка `Too Many Requests` или `429`:

Это лимит GigaChat. Подождите 1-2 минуты и попробуйте снова.

## Что лучше отправить другому человеку

Самый удобный текст для отправки:

```text
1. Установи Node.js LTS: https://nodejs.org/en/download

2. Если Windows: открой PowerShell и вставь:
npx.cmd --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz

3. Если Mac: открой Terminal и вставь:
npx --yes https://github.com/Lerman19/fearlessgame/archive/refs/heads/main.tar.gz

4. Когда откроется браузер, играй на http://localhost:5173

Окно PowerShell или Terminal не закрывай, пока идет игра.
```

## Файлы проекта

- `server.js` - локальный сервер и безопасный запрос к GigaChat.
- `bin/fearlessgame.js` - запуск через `npx` из GitHub.
- `public/index.html` - страница игры.
- `public/app.js` - логика интерфейса и начисления очков.
- `public/styles.css` - внешний вид.
- `.env` - локальные ключи GigaChat, не публиковать.
- `.env.example` - пример настроек без настоящих ключей.
