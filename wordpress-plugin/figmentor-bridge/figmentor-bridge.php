<?php
/**
 * Plugin Name: Figmentor Bridge
 * Plugin URI:  https://github.com/gulin-desigenr/figmentor-ia
 * Description: REST API para leitura e escrita de dados do Elementor. Usado pelo agente de IA para aplicar estilos automaticamente.
 * Version:     1.0.0
 * Author:      Pedro Gulin
 * License:     Private
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'FIGMENTOR_BRIDGE_VERSION', '1.0.0' );
define( 'FIGMENTOR_BRIDGE_DIR', plugin_dir_path( __FILE__ ) );

require_once FIGMENTOR_BRIDGE_DIR . 'includes/class-elementor-helper.php';
require_once FIGMENTOR_BRIDGE_DIR . 'includes/class-rest-api.php';

add_action( 'rest_api_init', function () {
    $api = new Figmentor_Bridge_REST_API();
    $api->register_routes();
} );
