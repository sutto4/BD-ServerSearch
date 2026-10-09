# Contributing

Small, focused fixes are welcome. Open an issue before proposing substantial new behavior.

## Local checks

Run `node --check ServerSearch.plugin.js` and `node tests/test.cjs`. No npm packages are required.

The automated tests cover filtering, stored-data validation, lifecycle cleanup, icon fallback, and navigation discovery/failure behavior with mocked APIs. They do not run Discord or validate the rendered panel.

## Manual verification

Use a desktop Discord installation with BetterDiscord:

1. Open the panel with its button and shortcut.
2. Search with mixed case, accents, multiple words, and a query with no matches.
3. Find a server inside a collapsed folder.
4. Open servers using mouse and keyboard. Confirm Discord does not reload.
5. Star/unstar results, filter Favorites, and restart the plugin to check persistence.
6. Check icons, a server without an icon, scrolling, and an empty results list.
7. Close with Escape and outside clicks. Disable while open and confirm the panel/button disappear.
8. Resize the window and check your theme for layout conflicts.

In a pull request, describe the behavior changed, checks performed, and any live-client limitations.

Keep the plugin self-contained. Do not add telemetry, token access, background account actions, or a browser-navigation fallback. Do not include private logs or server information in commits.
