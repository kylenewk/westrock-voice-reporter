// Global error handler — catches JS errors that happen before React mounts.
// This prevents silent crashes on launch in TestFlight/production builds.
if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error(`[GlobalError] ${isFatal ? "FATAL" : "non-fatal"}:`, error?.message, error?.stack);
    // Still call the original handler so React Native's red screen / crash reporting works
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Catch unhandled promise rejections
if (typeof global !== "undefined") {
  const onUnhandled = (id: string, error: any) => {
    console.error("[UnhandledPromise]", error?.message || error);
  };
  const tracking = require("promise/setimmediate/rejection-tracking");
  tracking.enable({ allRejections: true, onUnhandled });
}

import "expo-router/entry";
