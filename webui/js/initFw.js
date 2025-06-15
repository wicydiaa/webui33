(function() {
    const savedThemeJSON = localStorage.getItem('userCustomTheme');
    if (savedThemeJSON) {
        try {
            const savedTheme = JSON.parse(savedThemeJSON);

            // Apply Site Title
            if (savedTheme.siteTitle) {
                document.title = savedTheme.siteTitle;
            }

            // Apply Logo URL and Link
            // Ensure this runs after the DOM elements are available.
            // If initFw.js runs very early, might need DOMContentLoaded or defer to a function called later.
            // For now, assuming elements might be available or this script runs late enough.
            const logoImg = document.querySelector('#logo-container img');
            const logoLink = document.querySelector('#logo-container a');
            if (savedTheme.logoUrl && logoImg) {
                logoImg.src = savedTheme.logoUrl;
            }
            if (savedTheme.logoLinkUrl && logoLink) {
                logoLink.href = savedTheme.logoLinkUrl;
            }

            // Apply Global Theme Colors (from customTheme.colors)
            if (savedTheme.colors) {
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

            // Apply Per-Message Type Colors (from customTheme.messageColors)
            if (savedTheme.messageColors) {
                for (const messageType in savedTheme.messageColors) {
                    if (Object.prototype.hasOwnProperty.call(savedTheme.messageColors, messageType)) {
                        const bg = savedTheme.messageColors[messageType].background;
                        const text = savedTheme.messageColors[messageType].text;
                        if (bg) {
                            document.documentElement.style.setProperty('--message-' + messageType + '-bg', bg);
                        }
                        if (text) {
                            document.documentElement.style.setProperty('--message-' + messageType + '-text', text);
                        }
                    }
                }
            }

            // Apply Message Bubble Shape
            if (savedTheme.bubbleShape) {
                document.body.className = document.body.className.replace(/message-bubble-\w+/g, ''); // Clear existing
                if (savedTheme.bubbleShape !== 'default') {
                    document.body.classList.add('message-bubble-' + savedTheme.bubbleShape);
                } else {
                     document.body.classList.add('message-bubble-default'); // Explicitly add default
                }
            }

            // Set global Markdown state
            if (typeof savedTheme.markdownEnabled !== 'undefined') {
                window.markdownEnabled = savedTheme.markdownEnabled;
            } else {
                window.markdownEnabled = false; // Default if not set
            }

        } catch (e) {
            console.error('Error applying saved theme from initFw.js:', e);
            // localStorage.removeItem('userCustomTheme'); // Optional: clear corrupted theme
        }
    } else {
        // If no saved theme, ensure markdownEnabled has a default
        window.markdownEnabled = false;
        // Ensure body has default bubble shape class if not handled by CSS alone
        document.body.classList.add('message-bubble-default');
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
