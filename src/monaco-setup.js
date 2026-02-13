// Extensions must be imported first (side-effect imports)
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "@codingame/monaco-vscode-python-default-extension";

import { initialize } from "@codingame/monaco-vscode-api";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getConfigurationServiceOverride, {
  initUserConfiguration,
} from "@codingame/monaco-vscode-configuration-service-override";

// Worker setup — requires @codingame/esbuild-import-meta-url-plugin in vite config
const workerLoaders = {
  TextEditorWorker: () =>
    new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
      { type: "module" }
    ),
  TextMateWorker: () =>
    new Worker(
      new URL(
        "@codingame/monaco-vscode-textmate-service-override/worker",
        import.meta.url
      ),
      { type: "module" }
    ),
};

window.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    const workerFactory = workerLoaders[label];
    if (workerFactory != null) {
      return workerFactory();
    }
    throw new Error(`Worker ${label} not found`);
  },
};

// Set configuration BEFORE initialize to prevent theme flicker
const configReady = initUserConfiguration(
  JSON.stringify({
    "workbench.colorTheme": "Default Dark+",
    "editor.semanticHighlighting.enabled": true,
  })
);

// Initialize with service overrides
export const servicesReady = configReady.then(() =>
  initialize({
    ...getThemeServiceOverride(),
    ...getTextmateServiceOverride(),
    ...getLanguagesServiceOverride(),
    ...getConfigurationServiceOverride(),
  })
);
