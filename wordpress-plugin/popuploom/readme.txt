=== PopupLoom - Free Popup Builder Embeds ===
Contributors: popuploom
Tags: popup, popup builder, exit intent, lead capture, email signup
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add a PopupLoom popup to WordPress with one widget ID. No account connection, no tracking, no per-view fee.

== Description ==

This plugin prints the PopupLoom widget mount point and the hosted runtime in your site footer. You design the popup in the PopupLoom studio, save it, and paste the widget ID here. The popup configuration stays on PopupLoom, so changing the offer or design does not require editing the theme again.

**What it does**

* Adds one widget ID field under Settings > PopupLoom.
* Validates the ID against the PopupLoom format (starts with `wan_`).
* Loads `https://popuploom.com/embed/1.1.0/popuploom.js` with `defer`.
* Prints the mount element only when a valid ID is saved.

**What it does not do**

* It does not connect to your PopupLoom account or store an API key.
* It does not send email, SMS or notifications.
* It does not add WordPress tracking, cookies or analytics.
* It does not read cart, order or customer data.
* It does not bypass the popup's own targeting and frequency rules.

PopupLoom is free. There is no pageview cap and no paid upgrade inside the product. A free PopupLoom account is required to save a widget and get its ID.

== Installation ==

1. Upload the `popuploom` folder to `/wp-content/plugins/`, or install the ZIP through Plugins > Add New > Upload Plugin.
2. Activate the plugin.
3. Open Settings > PopupLoom.
4. Create and save a popup at https://popuploom.com/studio.html, then copy the widget ID from the Publish screen.
5. Paste the ID, save, and test the published site in a private window.

== Frequently Asked Questions ==

= Do I need a PopupLoom account? =

Yes. A free account is required to save a popup and get its widget ID. Designing and previewing as a guest does not issue install code.

= Will the popup appear in the WordPress editor? =

No. The runtime loads on the published site, not inside the editor or the block preview.

= Does it work with caching plugins? =

Usually, but purge the page cache after saving the ID. Some security or optimization plugins remove footer scripts; check the published page source if the popup does not appear.

= Can I show different popups on different pages? =

This plugin is intentionally one site-wide widget. For page-specific popups, use a Custom HTML block with the PopupLoom install code on that page, or use PopupLoom's own URL targeting on the saved widget.

= Is any visitor data sent to PopupLoom? =

The embedded runtime requests the saved popup configuration and records views and form submissions according to the popup's settings. See https://popuploom.com/privacy.html.

== Screenshots ==

1. Settings > PopupLoom with the widget ID field.

== Changelog ==

= 1.0.0 =
* First release. Single widget ID, footer output, validation, settings link.
