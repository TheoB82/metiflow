(function () {
    var STORAGE_KEY = 'metiflow_cookie_preferences_v1';

    function getSavedPreferences() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    function savePreferences(preferences) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            necessary: true,
            analytics: Boolean(preferences.analytics),
            acceptedAt: new Date().toISOString(),
            version: 'v1.0'
        }));
    }

    function applyPreferences(preferences) {
        // Gate all non-essential tracking behind explicit analytics consent.
        if (preferences.analytics && typeof window.enableOptionalTracking === 'function') {
            window.enableOptionalTracking();
        }
    }

    function buildBanner() {
        var wrapper = document.createElement('div');
        wrapper.id = 'cookie-banner';
        wrapper.className = 'fixed inset-x-0 bottom-0 z-[100] p-3 md:p-5';
        wrapper.innerHTML = '' +
            '<div class="mx-auto max-w-4xl rounded-2xl border border-slate-300 bg-white p-4 md:p-6 shadow-2xl">' +
                '<div class="md:flex md:items-start md:justify-between md:gap-6">' +
                    '<div>' +
                        '<h3 class="text-lg font-bold text-slate-900">Cookie preferences</h3>' +
                        '<p class="mt-2 text-sm text-slate-700">We use necessary cookies to run this site. Optional analytics cookies are only used if you accept them. See our <a href="/cookies" class="font-semibold text-sky-700 underline">Cookie Policy</a>.</p>' +
                    '</div>' +
                    '<div class="mt-4 flex flex-wrap gap-2 md:mt-0">' +
                        '<button id="cookie-accept-all" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Accept all</button>' +
                        '<button id="cookie-reject" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Reject non-essential</button>' +
                        '<button id="cookie-manage" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Preferences</button>' +
                    '</div>' +
                '</div>' +
                '<div id="cookie-panel" class="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-4">' +
                    '<label class="mb-3 flex items-start gap-3">' +
                        '<input type="checkbox" checked disabled class="mt-1 h-4 w-4">' +
                        '<span><span class="block text-sm font-semibold text-slate-900">Necessary cookies</span><span class="block text-xs text-slate-600">Required for core site functionality and always on.</span></span>' +
                    '</label>' +
                    '<label class="flex items-start gap-3">' +
                        '<input id="cookie-analytics" type="checkbox" class="mt-1 h-4 w-4">' +
                        '<span><span class="block text-sm font-semibold text-slate-900">Analytics cookies</span><span class="block text-xs text-slate-600">Used only with your consent for usage measurement and performance insights.</span></span>' +
                    '</label>' +
                    '<button id="cookie-save" class="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Save preferences</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(wrapper);

        var panel = document.getElementById('cookie-panel');
        var analyticsCheckbox = document.getElementById('cookie-analytics');
        var saved = getSavedPreferences();
        if (saved) {
            analyticsCheckbox.checked = Boolean(saved.analytics);
        }

        document.getElementById('cookie-manage').addEventListener('click', function () {
            panel.classList.toggle('hidden');
        });

        document.getElementById('cookie-accept-all').addEventListener('click', function () {
            var prefs = { analytics: true };
            savePreferences(prefs);
            applyPreferences(prefs);
            wrapper.remove();
        });

        document.getElementById('cookie-reject').addEventListener('click', function () {
            var prefs = { analytics: false };
            savePreferences(prefs);
            applyPreferences(prefs);
            wrapper.remove();
        });

        document.getElementById('cookie-save').addEventListener('click', function () {
            var prefs = { analytics: analyticsCheckbox.checked };
            savePreferences(prefs);
            applyPreferences(prefs);
            wrapper.remove();
        });
    }

    window.getCookiePreferences = getSavedPreferences;

    var current = getSavedPreferences();
    if (current) {
        applyPreferences(current);
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', buildBanner);
        } else {
            buildBanner();
        }
    }
})();
