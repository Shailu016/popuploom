<?php
/**
 * Uninstall: remove the saved widget ID only. No other data is stored.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'popuploom_widget_id' );
