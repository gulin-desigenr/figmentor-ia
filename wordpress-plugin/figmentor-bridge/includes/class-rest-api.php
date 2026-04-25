<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Figmentor_Bridge_REST_API {

    const NAMESPACE = 'figmentor/v1';

    public function register_routes() {
        register_rest_route(
            self::NAMESPACE,
            '/pages/(?P<page_id>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [ $this, 'get_page' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'page_id' => [
                        'required'          => true,
                        'validate_callback' => fn( $value ) => is_numeric( $value ) && $value > 0,
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/pages/(?P<page_id>\d+)/widgets/(?P<css_id>[a-z0-9\-]+)',
            [
                'methods'             => 'PUT',
                'callback'            => [ $this, 'update_widget' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'page_id'  => [
                        'required'          => true,
                        'validate_callback' => fn( $value ) => is_numeric( $value ) && $value > 0,
                    ],
                    'css_id'   => [
                        'required'          => true,
                        'validate_callback' => fn( $value ) => preg_match( '/^[a-z0-9\-]+$/', $value ),
                    ],
                    'settings' => [
                        'required'          => true,
                        'validate_callback' => fn( $value ) => is_array( $value ),
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/pages/(?P<page_id>\d+)/cache/clear',
            [
                'methods'             => 'POST',
                'callback'            => [ $this, 'clear_cache' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'page_id' => [
                        'required'          => true,
                        'validate_callback' => fn( $value ) => is_numeric( $value ) && $value > 0,
                    ],
                ],
            ]
        );
    }

    /**
     * Retorna a estrutura completa do Elementor para a página.
     *
     * Evita que camadas intermediárias sirvam essa resposta sem executar
     * o fluxo normal de autenticação da REST API.
     */
    public function get_page( WP_REST_Request $request ) {
        nocache_headers();

        $page_id = (int) $request->get_param( 'page_id' );
        $data    = Figmentor_Bridge_Elementor_Helper::get_page_data( $page_id );

        if ( is_wp_error( $data ) ) {
            return $data;
        }

        return rest_ensure_response(
            [
                'page_id'  => $page_id,
                'title'    => get_the_title( $page_id ),
                'elements' => $data,
            ]
        );
    }

    /**
     * Atualiza as settings de um widget pelo css_id.
     * Body JSON: { "settings": { ... } }
     */
    public function update_widget( WP_REST_Request $request ) {
        $page_id      = (int) $request->get_param( 'page_id' );
        $css_id       = sanitize_text_field( $request->get_param( 'css_id' ) );
        $new_settings = $request->get_param( 'settings' );

        if ( empty( $new_settings ) || ! is_array( $new_settings ) ) {
            return new WP_Error(
                'invalid_settings',
                'O campo "settings" é obrigatório e deve ser um objeto.',
                [ 'status' => 400 ]
            );
        }

        unset( $new_settings['css_id'] );

        $data = Figmentor_Bridge_Elementor_Helper::get_page_data( $page_id );
        if ( is_wp_error( $data ) ) {
            return $data;
        }

        $result = Figmentor_Bridge_Elementor_Helper::update_element_settings( $data, $css_id, $new_settings );
        if ( is_wp_error( $result ) ) {
            return $result;
        }

        $saved = Figmentor_Bridge_Elementor_Helper::save_page_data( $page_id, $data );
        if ( is_wp_error( $saved ) ) {
            return $saved;
        }

        return rest_ensure_response(
            [
                'success' => true,
                'page_id' => $page_id,
                'css_id'  => $css_id,
                'message' => 'Settings atualizadas com sucesso. Lembre de limpar o cache.',
            ]
        );
    }

    /**
     * Limpa o cache do Elementor.
     */
    public function clear_cache( WP_REST_Request $request ) {
        $result = Figmentor_Bridge_Elementor_Helper::clear_cache();

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return rest_ensure_response(
            [
                'success' => true,
                'message' => 'Cache do Elementor limpo com sucesso.',
            ]
        );
    }

    /**
     * Verifica autenticação via token próprio do plugin (header X-Figmentor-Token).
     * Fallback: Application Passwords / cookie session (current_user_can).
     */
    public function check_permission( WP_REST_Request $request ) {
        $stored_token = Figmentor_Bridge_Admin::get_token();

        // Método primário: token próprio do plugin
        if ( ! empty( $stored_token ) ) {
            $provided = $request->get_header( 'X-Figmentor-Token' );

            if ( ! empty( $provided ) && hash_equals( $stored_token, $provided ) ) {
                return true;
            }
        }

        // Fallback: autenticação WordPress nativa (Application Passwords, cookie, etc.)
        if ( current_user_can( 'edit_pages' ) ) {
            return true;
        }

        return new WP_Error(
            'unauthorized',
            'Forneça o header X-Figmentor-Token com o token gerado em Configurações > Figmentor Bridge.',
            [ 'status' => 401 ]
        );
    }
}
