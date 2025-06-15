
const settingsModalProxy = {
    isOpen: false,
    settings: {},
    resolvePromise: null,
    activeTab: 'agent', // Default tab

    customTheme: {
        colors: {
            backgroundDark: '#121212',
            textDark: '#E0E0E0',
            primaryDark: '#BB86FC',
            secondaryDark: '#373737',
            accentDark: '#03DAC6',
            messageBgDark: '#1E1E1E',
            panelDark: '#1A1A1A',
            borderDark: '#2C2C2C',
            inputDark: '#232323',
            inputFocusDark: '#2A2A2A',
            // Light theme colors
            backgroundLight: '#FFFFFF',
            textLight: '#212121',
            primaryLight: '#6200EE',
            secondaryLight: '#F5F5F5',
            accentLight: '#03DAC6',
            messageBgLight: '#F0F0F0',
            panelLight: '#FFFFFF',
            borderLight: '#E0E0E0',
            inputLight: '#F5F5F5',
            inputFocusLight: '#EEEEEE',
        },
        bubbleShape: 'default'
    },
    defaultTheme: {}, // Will be populated in init

    // Computed property for filtered sections
    get filteredSections() {
        if (!this.settings || !this.settings.sections) return [];
        const filteredSections = this.settings.sections.filter(section => section.tab === this.activeTab);

        // If no sections match the current tab (or all tabs are missing), show all sections
        if (filteredSections.length === 0) {
            return this.settings.sections;
        }

        return filteredSections;
    },

    // Switch tab method
    switchTab(tabName) {
        // Update our component state
        this.activeTab = tabName;

        // Update the store safely
        const store = Alpine.store('root');
        if (store) {
            store.activeTab = tabName;
        }

        localStorage.setItem('settingsActiveTab', tabName);

        // Auto-scroll active tab into view after a short delay to ensure DOM updates
        setTimeout(() => {
            const activeTab = document.querySelector('.settings-tab.active');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }

            // When switching to the scheduler tab, initialize Flatpickr components
            if (tabName === 'scheduler') {
                console.log('Switching to scheduler tab, initializing Flatpickr');
                const schedulerElement = document.querySelector('[x-data="schedulerSettings"]');
                if (schedulerElement) {
                    const schedulerData = Alpine.$data(schedulerElement);
                    if (schedulerData) {
                        // Start polling
                        if (typeof schedulerData.startPolling === 'function') {
                            schedulerData.startPolling();
                        }

                        // Initialize Flatpickr if editing or creating
                        if (typeof schedulerData.initFlatpickr === 'function') {
                            // Check if we're creating or editing and initialize accordingly
                            if (schedulerData.isCreating) {
                                schedulerData.initFlatpickr('create');
                            } else if (schedulerData.isEditing) {
                                schedulerData.initFlatpickr('edit');
                            }
                        }

                        // Force an immediate fetch
                        if (typeof schedulerData.fetchTasks === 'function') {
                            schedulerData.fetchTasks();
                        }
                    }
                }
            }

            // When switching to the tunnel tab, initialize tunnelSettings
            if (tabName === 'tunnel') {
                console.log('Switching to tunnel tab, initializing tunnelSettings');
                const tunnelElement = document.querySelector('[x-data="tunnelSettings"]');
                if (tunnelElement) {
                    const tunnelData = Alpine.$data(tunnelElement);
                    if (tunnelData && typeof tunnelData.checkTunnelStatus === 'function') {
                        // Check tunnel status
                        tunnelData.checkTunnelStatus();
                    }
                }
            }
        }, 10);
    },

    async openModal() {
        console.log('Settings modal opening');
        const modalEl = document.getElementById('settingsModal');
        const modalAD = Alpine.$data(modalEl);

        // First, ensure the store is updated properly
        const store = Alpine.store('root');
        if (store) {
            // Set isOpen first to ensure proper state
            store.isOpen = true;
        }

        //get settings from backend
        try {
            const set = await sendJsonData("/settings_get", null);

            // First load the settings data without setting the active tab
            const settings = {
                "title": "Settings",
                "buttons": [
                    {
                        "id": "save",
                        "title": "Save",
                        "classes": "btn btn-ok"
                    },
                    {
                        "id": "cancel",
                        "title": "Cancel",
                        "type": "secondary",
                        "classes": "btn btn-cancel"
                    }
                ],
                "sections": set.settings.sections
            }

            // Update modal data
            modalAD.isOpen = true;
            modalAD.settings = settings;

            // Now set the active tab after the modal is open
            // This ensures Alpine reactivity works as expected
            setTimeout(() => {
                // Get stored tab or default to 'agent'
                const savedTab = localStorage.getItem('settingsActiveTab') || 'agent';
                console.log(`Setting initial tab to: ${savedTab}`);

                // Directly set the active tab
                modalAD.activeTab = savedTab;

                // Also update the store
                if (store) {
                    store.activeTab = savedTab;
                }

                localStorage.setItem('settingsActiveTab', savedTab);

                // Initialize and load custom theme settings
                if (typeof this.initCustomTheme === 'function') {
                    this.initCustomTheme();
                }


                // Add a small delay *after* setting the tab to ensure scrolling works
                setTimeout(() => {
                    const activeTabElement = document.querySelector('.settings-tab.active');
                    if (activeTabElement) {
                        activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                    // Debug log
                    const schedulerTab = document.querySelector('.settings-tab[title="Task Scheduler"]');
                    console.log(`Current active tab after direct set: ${modalAD.activeTab}`);
                    console.log('Scheduler tab active after direct initialization?',
                        schedulerTab && schedulerTab.classList.contains('active'));

                    // Explicitly start polling if we're on the scheduler tab
                    if (modalAD.activeTab === 'scheduler') {
                        console.log('Settings opened directly to scheduler tab, initializing polling');
                        const schedulerElement = document.querySelector('[x-data="schedulerSettings"]');
                        if (schedulerElement) {
                            const schedulerData = Alpine.$data(schedulerElement);
                            if (schedulerData && typeof schedulerData.startPolling === 'function') {
                                schedulerData.startPolling();
                                // Also force an immediate fetch
                                if (typeof schedulerData.fetchTasks === 'function') {
                                    schedulerData.fetchTasks();
                                }
                            }
                        }
                    }
                }, 10); // Small delay just for scrolling

            }, 5); // Keep a minimal delay for modal opening reactivity

            // Add a watcher to disable the Save button when a task is being created or edited
            // This might need to be adjusted if theme tab also has save button logic
            const schedulerComponent = document.querySelector('[x-data="schedulerSettings"]');
            if (schedulerComponent) {
                // Watch for changes to the scheduler's editing state
                const checkSchedulerEditingState = () => {
                    const schedulerData = Alpine.$data(schedulerComponent);
                    if (schedulerData) {
                        // If we're on the scheduler tab and creating/editing a task, disable the Save button
                        const saveButton = document.querySelector('.modal-footer button.btn-ok');
                        if (saveButton && modalAD.activeTab === 'scheduler' &&
                            (schedulerData.isCreating || schedulerData.isEditing)) {
                            saveButton.disabled = true;
                            saveButton.classList.add('btn-disabled');
                        } else if (saveButton) {
                            saveButton.disabled = false;
                            saveButton.classList.remove('btn-disabled');
                        }
                    }
                };

                // Add a mutation observer to detect changes in the scheduler component's state
                const observer = new MutationObserver(checkSchedulerEditingState);
                observer.observe(schedulerComponent, { attributes: true, subtree: true, childList: true });

                // Also watch for tab changes to update button state
                modalAD.$watch('activeTab', checkSchedulerEditingState);

                // Initial check
                setTimeout(checkSchedulerEditingState, 100);
            }

            return new Promise(resolve => {
                this.resolvePromise = resolve;
            });

        } catch (e) {
            window.toastFetchError("Error getting settings", e)
        }
    },

    async handleButton(buttonId) {
        if (buttonId === 'save') {

            const modalEl = document.getElementById('settingsModal');
            const modalAD = Alpine.$data(modalEl);
            try {
                resp = await window.sendJsonData("/settings_set", modalAD.settings);
            } catch (e) {
                window.toastFetchError("Error saving settings", e)
                return
            }
            document.dispatchEvent(new CustomEvent('settings-updated', { detail: resp.settings }));
            this.resolvePromise({
                status: 'saved',
                data: resp.settings
            });
        } else if (buttonId === 'cancel') {
            this.handleCancel();
        }

        // Stop scheduler polling if it's running
        this.stopSchedulerPolling();

        // First update our component state
        this.isOpen = false;

        // Then safely update the store
        const store = Alpine.store('root');
        if (store) {
            // Use a slight delay to avoid reactivity issues
            setTimeout(() => {
                store.isOpen = false;
            }, 10);
        }
    },

    async handleCancel() {
        this.resolvePromise({
            status: 'cancelled',
            data: null
        });

        // Stop scheduler polling if it's running
        this.stopSchedulerPolling();

        // First update our component state
        this.isOpen = false;

        // Then safely update the store
        const store = Alpine.store('root');
        if (store) {
            // Use a slight delay to avoid reactivity issues
            setTimeout(() => {
                store.isOpen = false;
            }, 10);
        }
    },

    // Add a helper method to stop scheduler polling
    stopSchedulerPolling() {
        // Find the scheduler component and stop polling if it exists
        const schedulerElement = document.querySelector('[x-data="schedulerSettings"]');
        if (schedulerElement) {
            const schedulerData = Alpine.$data(schedulerElement);
            if (schedulerData && typeof schedulerData.stopPolling === 'function') {
                console.log('Stopping scheduler polling on modal close');
                schedulerData.stopPolling();
            }
        }
    },

    async handleFieldButton(field) {
        console.log(`Button clicked: ${field.id}`);

        if (field.id === "mcp_servers_config") {
            openModal("settings/mcp/client/mcp-servers.html");
        }
    },

    // Theme Customization Methods
    initCustomTheme() {
        // Deep copy default theme to avoid modifying it when customTheme changes
        this.defaultTheme = JSON.parse(JSON.stringify(this.customTheme));
        this.loadCustomThemeFromLocalStorage();

        // Watch for changes in customTheme to apply them live
        // Note: This $watch is conceptual for settingsModalProxy.
        // In Alpine, $watch is typically used within an Alpine.data component context.
        // If settingsModalProxy is a global object used by an Alpine component,
        // the $watch should be set up in that component's init referring to this proxy.
        // For now, we'll assume direct application on save/load/reset.
    },

    applyCustomTheme() {
        for (const key in this.customTheme.colors) {
            let cssVarName = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            document.documentElement.style.setProperty(cssVarName, this.customTheme.colors[key]);
        }
        this.applyBubbleShape(this.customTheme.bubbleShape);
    },

    applyBubbleShape(shapeValue) {
        const bodyClasses = document.body.classList;
        ['message-bubble-rounded', 'message-bubble-slightly-rounded', 'message-bubble-square'].forEach(cls => bodyClasses.remove(cls));
        if (shapeValue && shapeValue !== 'default') {
            bodyClasses.add('message-bubble-' + shapeValue);
        }
    },

    saveCustomTheme() {
        localStorage.setItem('userCustomTheme', JSON.stringify(this.customTheme));
        this.applyCustomTheme(); // Apply immediately
        // Consider adding a toast message here: showToast('Theme saved!', 'success');
    },

    loadCustomThemeFromLocalStorage() {
        const savedTheme = localStorage.getItem('userCustomTheme');
        if (savedTheme) {
            try {
                const parsedTheme = JSON.parse(savedTheme);
                // Merge saved theme with defaults to ensure all properties are present
                this.customTheme = {
                    ...JSON.parse(JSON.stringify(this.defaultTheme)), // Start with a copy of defaults
                    ...parsedTheme, // Override with saved values
                    colors: { // Ensure colors object is also merged deeply
                        ...JSON.parse(JSON.stringify(this.defaultTheme.colors)),
                        ...(parsedTheme.colors || {})
                    }
                };
            } catch (e) {
                console.error("Error parsing saved theme, reverting to default:", e);
                this.customTheme = JSON.parse(JSON.stringify(this.defaultTheme));
            }
        } else {
            this.customTheme = JSON.parse(JSON.stringify(this.defaultTheme));
        }
        this.applyCustomTheme();
    },

    resetCustomTheme() {
        localStorage.removeItem('userCustomTheme');
        this.customTheme = JSON.parse(JSON.stringify(this.defaultTheme)); // Deep copy

        // Remove inline styles for all theme color variables
        const themeColorKeys = Object.keys(this.defaultTheme.colors);
        themeColorKeys.forEach(key => {
            let cssVarName = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            document.documentElement.style.removeProperty(cssVarName);
        });

        this.applyCustomTheme(); // This will re-apply defaults (from CSS or new defaults) and default bubble shape
         // Consider adding a toast message here: showToast('Theme reset to default!', 'info');
    }
};


// function initSettingsModal() {

//     window.openSettings = function () {
//         proxy.openModal().then(result => {
//             console.log(result);  // This will log the result when the modal is closed
//         });
//     }

//     return proxy
// }


// document.addEventListener('alpine:init', () => {
//     Alpine.store('settingsModal', initSettingsModal());
// });

document.addEventListener('alpine:init', function () {
    // Initialize the root store first to ensure it exists before components try to access it
    Alpine.store('root', {
        activeTab: localStorage.getItem('settingsActiveTab') || 'agent',
        isOpen: false,

        toggleSettings() {
            this.isOpen = !this.isOpen;
        }
    });

    // Then initialize other Alpine components
    Alpine.data('settingsModal', function () {
        // Give settingsModalProxy access to Alpine's reactivity if needed, e.g. for $watch.
        // However, the core logic is on settingsModalProxy.
        // We might need to ensure 'this' context is correct if methods are called from HTML.
        // A simple way is to spread the proxy, or explicitly delegate.

        // Make a shallow copy of settingsModalProxy and add Alpine specific init
        const componentData = { ...settingsModalProxy };

        componentData.initAlpineWatchers = function() {
            // Setup watchers for live theme updates
            // Ensure 'this' refers to the Alpine component instance,
            // which has customTheme from the spread.
            this.$watch('customTheme.colors', (newColors) => {
                for (const key in newColors) {
                    let cssVarName = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    document.documentElement.style.setProperty(cssVarName, newColors[key]);
                }
            }, { deep: true });

            this.$watch('customTheme.bubbleShape', (newShape) => {
                this.applyBubbleShape(newShape); // Assumes applyBubbleShape is on componentData
            });
        };

        return {
            ...componentData, // Spread the methods and properties from settingsModalProxy
            settingsData: {}, // Local to this Alpine component instance
            filteredSections: [], // Local
            // activeTab: 'agent', // This will be managed by settingsModalProxy through store
            isLoading: true, // Local

            async init() {
                // Initialize with the store value
                this.activeTab = Alpine.store('root').activeTab || 'agent';

                // Initialize theme settings (loads from localStorage and applies)
                if (typeof this.initCustomTheme === 'function') {
                    this.initCustomTheme(); // This will set this.customTheme and this.defaultTheme
                }

                // Setup watchers for live theme updates
                this.initAlpineWatchers();


                // Watch store tab changes
                this.$watch('$store.root.activeTab', (newTab) => {
                    if (typeof newTab !== 'undefined') {
                        this.activeTab = newTab;
                        localStorage.setItem('settingsActiveTab', newTab);
                        this.updateFilteredSections();
                    }
                });

                // Load settings
                await this.fetchSettings(); // This populates this.settingsData
                this.updateFilteredSections(); // This uses this.activeTab and this.settingsData
            },

            // switchTab is already on settingsModalProxy, which is spread here.
            // Ensure 'this' context is correctly handled if it relies on Alpine instance properties
            // not on the original proxy. For this structure, it should be fine.

            async fetchSettings() {
                try {
                    this.isLoading = true;
                    const response = await fetch('/api/settings_get', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.settings) {
                            this.settingsData = data.settings;
                        } else {
                            console.error('Invalid settings data format');
                        }
                    } else {
                        console.error('Failed to fetch settings:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error fetching settings:', error);
                } finally {
                    this.isLoading = false;
                }
            },

            updateFilteredSections() {
                // Filter sections based on active tab
                if (this.activeTab === 'agent') {
                    this.filteredSections = this.settingsData.sections?.filter(section =>
                        section.group === 'agent'
                    ) || [];
                } else if (this.activeTab === 'external') {
                    this.filteredSections = this.settingsData.sections?.filter(section =>
                        section.group === 'external'
                    ) || [];
                } else if (this.activeTab === 'developer') {
                    this.filteredSections = this.settingsData.sections?.filter(section =>
                        section.group === 'developer'
                    ) || [];
                } else {
                    // For any other tab, show nothing since those tabs have custom UI
                    this.filteredSections = [];
                }
            },

            async saveSettings() {
                try {
                    // First validate
                    for (const section of this.settingsData.sections) {
                        for (const field of section.fields) {
                            if (field.required && (!field.value || field.value.trim() === '')) {
                                showToast(`${field.title} in ${section.title} is required`, 'error');
                                return;
                            }
                        }
                    }

                    // Prepare data
                    const formData = {};
                    for (const section of this.settingsData.sections) {
                        for (const field of section.fields) {
                            formData[field.id] = field.value;
                        }
                    }

                    // Send request
                    const response = await fetch('/api/settings_save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    if (response.ok) {
                        showToast('Settings saved successfully', 'success');
                        // Refresh settings
                        await this.fetchSettings();
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to save settings');
                    }
                } catch (error) {
                    console.error('Error saving settings:', error);
                    showToast('Failed to save settings: ' + error.message, 'error');
                }
            },

            // Handle special button field actions
            handleFieldButton(field) {
                if (field.action === 'test_connection') {
                    this.testConnection(field);
                } else if (field.action === 'reveal_token') {
                    this.revealToken(field);
                } else if (field.action === 'generate_token') {
                    this.generateToken(field);
                } else {
                    console.warn('Unknown button action:', field.action);
                }
            },

            // Test API connection
            async testConnection(field) {
                try {
                    field.testResult = 'Testing...';
                    field.testStatus = 'loading';

                    // Find the API key field
                    let apiKey = '';
                    for (const section of this.settingsData.sections) {
                        for (const f of section.fields) {
                            if (f.id === field.target) {
                                apiKey = f.value;
                                break;
                            }
                        }
                    }

                    if (!apiKey) {
                        throw new Error('API key is required');
                    }

                    // Send test request
                    const response = await fetch('/api/test_connection', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            service: field.service,
                            api_key: apiKey
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        field.testResult = 'Connection successful!';
                        field.testStatus = 'success';
                    } else {
                        throw new Error(data.error || 'Connection failed');
                    }
                } catch (error) {
                    console.error('Connection test failed:', error);
                    field.testResult = `Failed: ${error.message}`;
                    field.testStatus = 'error';
                }
            },

            // Reveal token temporarily
            revealToken(field) {
                // Find target field
                for (const section of this.settingsData.sections) {
                    for (const f of section.fields) {
                        if (f.id === field.target) {
                            // Toggle field type
                            f.type = f.type === 'password' ? 'text' : 'password';

                            // Update button text
                            field.value = f.type === 'password' ? 'Show' : 'Hide';

                            break;
                        }
                    }
                }
            },

            // Generate random token
            generateToken(field) {
                // Find target field
                for (const section of this.settingsData.sections) {
                    for (const f of section.fields) {
                        if (f.id === field.target) {
                            // Generate random token
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let token = '';
                            for (let i = 0; i < 32; i++) {
                                token += chars.charAt(Math.floor(Math.random() * chars.length));
                            }

                            // Set field value
                            f.value = token;
                            break;
                        }
                    }
                }
            },

            closeModal() {
                // Stop scheduler polling before closing the modal
                const schedulerElement = document.querySelector('[x-data="schedulerSettings"]');
                if (schedulerElement) {
                    const schedulerData = Alpine.$data(schedulerElement);
                    if (schedulerData && typeof schedulerData.stopPolling === 'function') {
                        console.log('Stopping scheduler polling on modal close');
                        schedulerData.stopPolling();
                    }
                }

                this.$store.root.isOpen = false;
            }
        };
    });
});

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
