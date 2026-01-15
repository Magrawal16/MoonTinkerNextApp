// Centralized API base URLs for client and server.
// Configure by editing this file. Comment/uncomment the ACTIVE_ENV
// or change the selected environment to switch between Dev/UAT/Prod.

type EnvName = "development" | "uat" | "production";

// Available base URLs. Comment or adjust entries as needed.
const BASES: Record<EnvName, { client: string; external: string }> = {
  development: {
    // Client hits Next.js proxy to inject security key/CORS
    client: "/api",
    // Local upstream API (used by server proxy)
    external: "https://localhost:7230/api",
  },
  uat: {
    client: "/api",
    external: "https://dev.moonr.com/MoonTinkerService/api",
  },
  production: {
    client: "/api",
    // TODO: set production upstream when available
    external: "https://prod.example.com/MoonTinkerService/api",
  },
};

// Select the active environment here.
// Switch to "development" for local, "uat" for testing, "production" when ready.
const ACTIVE_ENV: EnvName = "uat";
// const ACTIVE_ENV: EnvName = "development";
// const ACTIVE_ENV: EnvName = "production";

export const CLIENT_API_BASE = BASES[ACTIVE_ENV].client.replace(/\/+$/g, "");
export const EXTERNAL_API_BASE = BASES[ACTIVE_ENV].external.replace(/\/+$/g, "");
