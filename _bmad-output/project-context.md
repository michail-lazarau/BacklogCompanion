---
project_name: 'BacklogCompanion'
user_name: 'm.lazarau'
date: '2026-02-19'
sections_completed: ['technology_stack', 'critical_rules']
existing_patterns_found: 15
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Technologies
- **Framework**: React Native 0.83.1 (New Architecture enabled via `nitro-modules`)
- **Language**: TypeScript (Strict Mode enabled via `@react-native/typescript-config`)
- **Navigation**: React Navigation v7 (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- **State Management**: 
  - Redux Toolkit (`@reduxjs/toolkit`) + Redux Persist
  - TanStack Query v5 (`@tanstack/react-query`) for server state
- **Storage**: MMKV (`react-native-mmkv`)
- **Styling**: `StyleSheet` with `react-native-vector-icons`

### Key Dependencies
- **Sensors/Camera**: `react-native-vision-camera`
- **UI Utilities**: `react-native-safe-area-context`, `react-native-keyboard-aware-scroll-view`
- **Networking**: `react-native-sse`
- **Testing**: Jest (`jest`, `@types/jest`)

---

## Critical Implementation Rules

### Code Style & Conventions
- **Indentation**: 2 spaces.
- **Strings**: Single quotes.
- **Variable/Function Names**: camelCase (e.g., `fetchUserData`).
- **Class/Type Names**: PascalCase (e.g., `UserProfile`).
- **Components**: Functional components, prefer `const`, suffix hooks with `use*`.
- **Typing**: Explicit types preferred; avoid `any`.
- **Comments**: JSDoc for functions/classes; explain "why" not "what" for complex logic.
- **Import/Export**: Use named exports for consistency unless default is standard for the library.

### React Native Best Practices
- **Structure**: Group related functions/components; separate concerns (components, utils, services).
- **Styling**: Use `StyleSheet` objects; avoid inline styles for performance.
- **State**: Prefer `useState`/`useEffect` for local state; Redux for global complex state.
- **Accessibility**: Ensure accessible roles and labels are present on UI components.
- **Compatibility**: Ensure code is compatible with latest stable ECMAScript version.

### Testing & Quality
- **Principles**: Follow AAA (Arrange-Act-Assert) pattern.
- **Framework**: Use consistent testing framework logic for React Native.
- **Error Handling**: Use async/await syntax; handle errors gracefully (try/catch).

### Folder Structure Patterns
- `src/screens/`: Screen components named `[Name]Screen.tsx`.
- `src/navigation/`: Navigator configurations.
- `src/data/`: Data layer (API, query, store).
- `src/res/`: Resources like themes and colors.
