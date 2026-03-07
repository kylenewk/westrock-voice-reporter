// Safe global error handler — catches fatal JS errors and shows them
// as an alert instead of crashing to the home screen.
// IMPORTANT: Must use require() (not import) so this code runs BEFORE
// expo-router evaluates. ES import statements are hoisted above all other code.
const _origHandler = global.ErrorUtils?.getGlobalHandler?.();
if (global.ErrorUtils?.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const msg = error?.message || String(error);
    if (isFatal) {
      // Try to show the error to the user via Alert
      try {
        const { Alert } = require("react-native");
        Alert.alert(
          "Startup Error",
          msg + "\n\n(This error would normally crash the app.)",
        );
      } catch (_) {
        // Alert may not be available yet
      }
      // Do NOT forward to the original handler — that would crash the app
      console.error("[FATAL ERROR CAUGHT]", msg);
      if (error?.stack) console.error(error.stack);
    } else if (_origHandler) {
      _origHandler(error, isFatal);
    }
  });
}

require("expo-router/entry");
