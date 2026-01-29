Smart Backlog Companion - ИИ-помощник, который анализирует Steam библиотеку и решает, во что играть сегодня. Сканируем QR с SteamID → получаем "умные" рекомендации по настроению и времени сессии. Выбираем "жертву" из backlog.
 
Общий цикл приложения: Авторизация → Библиотека (просмотр) → ИИ (решение) → Детали (подтверждение) → повтор. С QR/deeplink для обмена "попробуй эту игру".

--------

MVP (краткое изложение):
1. Splash (QR-first) → QR Scan → SteamID → Library с реальными играми.

Splash screen (не актуальный, нужно перегенерировать): https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/2cec2c92-a702-4585-9593-cb897ea1a8e2.png

Сканирование QR: https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/34e815a4-636e-43b7-96ae-7e395601ac76.png

2. Library:
- Поиск, фильтры, список игр.

Library screen: https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/9d9090be-9dc7-4ae5-81b5-97bf1d912cca.png

3. Game Detail (лайт-версия).

Game detail screen: https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/9aab8858-a3ab-424e-be62-60af30668447.png

4. AI экран:
- Один LLM, один ключ, генерация рекомендаций по библиотеке.

Ai recommendation screen: https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/256aadfe-a301-4f5c-a7ac-315ed3361569.png

5. Profile/Settings:
- SteamID, LLM API key, один провайдер.

Profile settings screen: https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/dda0fa37-b2f6-498c-b9f8-a39599c91729.png

6. Локальное хранение (mmkv/AsyncStorage), без Firebase.

Extra =
Firebase (Auth, Firestore, Messaging), Google Sign‑In, продвинутая статистика и вкладки в Game Detail, несколько LLM провайдеров и выбор активного, deep linking, расширенный QR sharing, сложные анимации, Saga‑heavy оркестрация.

--------

MVP (Развернуто)
 
Сканировать QR → видеть свою Steam библиотеку → получать ИИ‑рекомендацию, во что поиграть. Всё остальное - надстройка.

1. Архитектура, окружение, TypeScript

- Базовый RN-проект с TypeScript, ESLint/Prettier.
- Понимание New Architecture и использование в проекте: https://reactnative.dev/architecture/landing-page


- Структура проекта - layer-based архитектура:
-- Presentation Layer: screens/, components/
-- Navigation Layer: navigation/,
-- Data Layer (state management, API calls, business logic): data/
-- Resources Layer (static assets, translations, themes, constants): res/
-- Utilities Layer: utils/

2. Навигация, UI, основной user flow

Экраны/табы:

- Splash/Auth (QR-first).
- Library (Home).
- Game Detail (минимальный).
- AI Suggestions.
- QR Scan.
- Profile/Settings (упрощённый).
- Базовая верстка и анимации “по минимуму” (нажатия, плавные переходы).

3. Steam интеграция + QR Workflow

- Логика QR Workflow:
-- Экран Splash → кнопка “Сканировать QR Steam ID”.
-- Экран QR Scan (Vision Camera) → считывание steamId или URL c ним.
-- Fallback: ручной ввод SteamID в Profile/Settings.

- Интеграция с Steam Web API:
-- Получение списка игр (GetOwnedGames) по SteamID.
-- Минимальные поля: appid, название, иконка/обложка, общее время.

- Отображение реальной библиотеки на Home/Library.

4. AI Suggestions (самое ценное после Steam)

- Один LLM-провайдер (например, OpenAI или Gemini) с одним API ключом, хранящимся локально (mmkv/AsyncStorage).

- Экран AI:
-- Mood (простые пресеты, 2–3 опции) и Session length (пара значений).
-- Кнопка “Сгенерировать рекомендацию”.
-- Карточка с 1 игрой и кратким объяснением (1–3 пункта).

- Логика выбора кандидатов:
-- Фильтрация локальным кодом по playtime/флагам.
-- LLM получает shortlist и возвращает “лучшую”. Использование Reasoning версии llm агента (fast/cheap) для оценки игр по всему массиву данных личной библиотеки, полученных от steam api. Промпт может рекомендовать игры отсутствующие в библиотеке, но учитывая продукты из нее, например: много игр RE - предложить недавние/наступающие релизы той же серии игр, разработчика или издателя.

5. State management (Redux Toolkit, Saga и т.п.)

Redux Toolkit - только настройки:

- steamId, llmApiKey, UI-флаги в будущем (фильтры, mood)

Flow:

QR → setSteamId(id) → React Query auto-fetch → библиотека загружена
AI → library из кеша → mutate() для LLM запроса (no caching) → рекомендация готова

Что где хранится:

Данные            Redux         React Query

steamId, apiKey     ✅               ❌

Steam библиотека    ❌          ✅ useQuery

ИИ рекомендация     ❌          ✅ useMutation

Фильтры UI          ✅               ❌

Redux - настройки. React Query - HTTP + кеш.


6. Game Detail Screen

- Обложка, название, общее время, последний запуск (если есть).

7. Profile / Settings

- Один LLM provider (например, “OpenAI”) фиксированно в коде, без UI выбора.

- Поля:
-- SteamID (ввод/редактирование).
-- API ключ LLM.

- Простой toggle:
-- “Использовать ИИ для рекомендаций” (вкл/выкл).

- Всё хранится в mmkv/AsyncStorage, без Firebase.

8. Deep linking, Sharing, QR расширения

- QR только для:
-- Импорта SteamID.


9. Animations

- Default transition animations from React Navigation.

--------

Post MVP roadmap:


2. Навигация, UI, основной user flow

- Чипы-фильтры (All / Не сыграно / Короткие) + поиск по названию (точный по подстроке)


3. Steam интеграция + QR Workflow
- Загрузка достижений, расширенной статистики, friends/online и прочего.
- Сложная логика обхода приватных профилей (для MVP можно показать понятный error-state).

4. AI Suggestions
- Поддержка нескольких провайдеров (Claude, Groq и т.п.) с выбором “Активный провайдер” в настройках.
- Сложные промпты, несколько рекомендаций за раз, сохранение истории рекомендаций.
- Усложнённая персонализация (учёт жанров, времени суток, настроения с прошлого раза).
- Логика выбора кандидатов:
-- Фильтрация локальным кодом по playtime/флагам.


5. State management

- Redux Toolkit:
-- steamSlice (library, статус загрузки, ошибка).
-- aiSlice (параметры mood/session, текущая рекомендация, статус загрузки).
-- userSlice (steamId, выбранный LLM provider, apiKey).

- Redux-Saga:
-- Сложные сценарии: параллельные запросы, ретраи, дебаунс, отмена.
-- Оркестрация push‑уведомлений, фоновых обновлений.

6. Game Detail Screen (в порядке приоритета)
- Пара базовых текстовых блоков (“Подходит для коротких сессий”, “Давно не запускали”) - можно считать это pseudo-AI/логикой.
- Кнопка “Открыть в Steam” (ссылка в браузер/мобильный Steam App).

- Вкладки:
-- Stats (графики, распределение по времени).
-- Achievements (список, прогресс).
-- Полноценная AI‑вкладка внутри Game Detail (отдельная от AI-секции в табе).

- Любые сложные визуализации (charts, таймлайны).

7. Profile / Settings

- Дерево провайдеров:
-- Список доступных: OpenAI, Gemini, Groq, “Custom HTTP endpoint”.
-- UI: “Активный провайдер”.

- Синхронизация этих настроек через Firebase (один профиль на всех устройствах).

8. Deep linking, Sharing, QR расширения

- Deep links
- QR для шейринга “Поделиться рекомендацией”

9. Animations
 
- Небольшие анимации:
-- Press feedback (scale/fade).
-- Плавный показ карточки рекомендации (простой Animated API).

- Более сложные сценарии:
-- Parallax header в Game Detail.
-- Fancy transitions между AI → Game Detail.

10. Firebase, Auth, Push

- Google Sign‑In (Firebase Auth) для:
-- Автологина и мульти-девайса.

- Firestore:
-- Синхронизация настроек, истории рекомендаций.

- Push “daily suggestion” (Firebase Messaging):
-- “У тебя 1 час — вот игра на вечер”