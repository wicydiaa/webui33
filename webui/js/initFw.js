(function() {
    const savedThemeJSON = localStorage.getItem('userCustomTheme');
    if (savedThemeJSON) {
        try {
            const savedTheme = JSON.parse(savedThemeJSON);

            if (savedTheme && savedTheme.colors) {
                for (const colorKey in savedTheme.colors) {
                    if (Object.prototype.hasOwnProperty.call(savedTheme.colors, colorKey)) {
                        // Construct CSS variable name from colorKey
                        // e.g., backgroundDark -> --color-background-dark
                        // This needs to precisely match the keys stored by settings.js and the CSS variables
                        let cssVarName = '--color-' + colorKey.replace(/([A-Z])/g, '-$1').toLowerCase();
                        document.documentElement.style.setProperty(cssVarName, savedTheme.colors[colorKey]);
                    }
                }
            }

            if (savedTheme && savedTheme.bubbleShape) {
                // Remove any existing bubble shape classes from body
                document.body.className = document.body.className.replace(/message-bubble-\w+/g, '');
                if (savedTheme.bubbleShape !== 'default') {
                    document.body.classList.add('message-bubble-' + savedTheme.bubbleShape);
                } else {
                    // Optional: explicitly add a default class if your CSS relies on it
                    // document.body.classList.add('message-bubble-default');
                }
            }
        } catch (e) {
            console.error('Error applying saved theme:', e);
            // Optionally clear the corrupted theme from localStorage
            // localStorage.removeItem('userCustomTheme');
        }
    }
})();

import * as _modals from "./modals.js";
import * as _components from "./components.js";

await import("./alpine.min.js");

// add x-destroy directive
Alpine.directive(
  "destroy",
  (el, { expression }, { evaluateLater, cleanup }) => {
    const onDestroy = evaluateLater(expression);
    cleanup(() => onDestroy());
  }
);
