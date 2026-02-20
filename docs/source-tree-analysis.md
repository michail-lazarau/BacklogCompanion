# Source Tree Analysis

## Directory Structure

```plaintext
/Users/m.lazarau@godeltech.com/repositories/BacklogCompanion/
├── src/
│   ├── components/       # (Empty) Reusable UI components
│   ├── data/            # Data layer logic
│   │   ├── api/         # API Clients (Steam, LLM)
│   │   ├── query/       # TanStack Query logic
│   │   └── store/       # Redux Toolkit slices (User, Metadata)
│   ├── hooks/           # Custom React hooks
│   │   ├── useGenerateSuggestions.ts # AI suggestion logic
│   │   └── useSteam.ts  # Steam library data fetching
│   ├── navigation/      # Navigation configuration
│   │   ├── AppNavigator.tsx       # Root stack navigator
│   │   └── MainTabNavigator.tsx   # Main bottom tab navigator
│   ├── res/             # Resources (theme, colors)
│   ├── screens/         # Screen components
│   │   ├── AIScreen.tsx        # AI suggestions interface
│   │   ├── LibraryScreen.tsx   # Steam library view
│   │   ├── QRScanScreen.tsx    # Steam Login via QR
│   │   └── SplashScreen.tsx    # Initial loading screen
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
│       ├── buildCompressedPrompt.ts # LLM prompt engineering
│       ├── compressLibrary.ts       # Data compression for LLM context
│       └── steamDataTransformer.ts  # Steam API data handling
├── android/             # Android native project
├── ios/                 # iOS native project
├── docs/                # Project documentation
└── _bmad_output/        # Agent artifacts
```

## Critical Folders Analysis

### src/screens/ (`screens/`)
Contains the primary views of the application.
- **LibraryScreen**: Core feature displaying user's game library.
- **AIScreen**: Interface for AI-powered backlog recommendations.
- **QRScanScreen**: Bridge for authenticating with Steam (likely via QR code scanning mechanism).

### src/data/ (`data/`)
The backbone of the application's state and data fetching.
- **api/**: Direct API interaction layer.
- **store/**: Global state management (Redux).
- **query/**: Server state management (React Query).

### src/utils/ (`utils/`)
Heavy logic for processing data, particularly for the AI features.
- **compressLibrary.ts**: Optimization logic to fit game library data into LLM context windows.
- **steamDataTransformer.ts**: Normalizes raw Steam API responses.

## Integration Points
- **Steam API**: Integrated via `src/data/api/steam.ts` and `src/hooks/useSteam.ts`.
- **LLM Service**: Integrated via `src/data/api/llm.ts` and `src/hooks/useGenerateSuggestions.ts`.
