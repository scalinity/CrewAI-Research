// Shared API base URL. In Electron production mode the app loads via file://,
// so relative fetch paths like "/api/run" resolve to "file:///api/run" and fail.
// Detect file:// and fall back to the known backend address.
export const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:8000"
    : "";
