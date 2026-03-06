// Capture fatal JS errors before React Native's ExceptionsManager aborts
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    // Store error for display - don't let RN abort
    if (isFatal) {
      const { AppRegistry, Text, View } = require("react-native");
      const React = require("react");

      const ErrorApp = () =>
        React.createElement(
          View,
          {
            style: {
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              backgroundColor: "#1a1a2e",
            },
          },
          React.createElement(
            Text,
            { style: { color: "#e94560", fontSize: 18, fontWeight: "bold", marginBottom: 12 } },
            "App Error"
          ),
          React.createElement(
            Text,
            { style: { color: "#ffffff", fontSize: 14, textAlign: "center" } },
            String(error?.message || error)
          ),
          React.createElement(
            Text,
            { style: { color: "#b2bec3", fontSize: 11, marginTop: 12, textAlign: "center" } },
            String(error?.stack || "").slice(0, 500)
          )
        );

      AppRegistry.registerComponent("main", () => ErrorApp);
      return; // Don't call original handler (which aborts)
    }

    // Non-fatal: pass through
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

import "expo-router/entry";
