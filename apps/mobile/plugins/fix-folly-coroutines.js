const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to fix build issues with RN 0.81 + Xcode 16.2+
 * 1. Disables Folly coroutines (missing header) via Podfile
 * 2. Patches source files missing C++ standard library includes
 */
function fixXcodeBuildIssues(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosDir, "Podfile");

      // --- 1. Fix Podfile: disable Folly coroutines ---
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const buildFixes = `
    # Fix: Disable Folly coroutines (RN 0.81 + Xcode 16.2+)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_HAS_COROUTINES=0'
      end
    end
`;

      podfile = podfile.replace(
        /(\n  end\nend)\s*$/,
        `${buildFixes}  end\nend\n`
      );

      fs.writeFileSync(podfilePath, podfile);

      // --- 2. Patch source files missing #include <utility> ---
      // Find the monorepo root by walking up from projectRoot
      function findNodeModules(startDir) {
        let dir = startDir;
        while (dir !== path.dirname(dir)) {
          const candidate = path.join(dir, "node_modules");
          if (fs.existsSync(candidate)) return candidate;
          dir = path.dirname(dir);
        }
        return null;
      }

      const projectRoot = config.modRequest.projectRoot;
      const nodeModules = findNodeModules(projectRoot);

      if (nodeModules) {
        const filesToPatch = [
          path.join(nodeModules, "react-native-screens/ios/RNSScreenStackHeaderConfig.mm"),
        ];

        for (const filePath of filesToPatch) {
          if (!fs.existsSync(filePath)) continue;

          let content = fs.readFileSync(filePath, "utf-8");

          // Skip if already patched
          if (content.startsWith("#include <utility>")) continue;

          // Add #include <utility> at the very top of the file
          content = `#include <utility> // Xcode 16.2+ compat\n${content}`;

          fs.writeFileSync(filePath, content);
          console.log(`Patched: ${filePath}`);
        }
      }

      return config;
    },
  ]);
}

module.exports = fixXcodeBuildIssues;
