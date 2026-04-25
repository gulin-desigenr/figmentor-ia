<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Figmentor_Bridge_Elementor_Helper {

    /**
     * Lê e decodifica os dados do Elementor de uma página.
     * Retorna array ou WP_Error.
     */
    public static function get_page_data( $page_id ) {
        if ( ! get_post( $page_id ) ) {
            return new WP_Error( 'not_found', 'Página não encontrada.', [ 'status' => 404 ] );
        }

        $raw = get_post_meta( $page_id, '_elementor_data', true );

        if ( empty( $raw ) ) {
            return new WP_Error(
                'no_elementor_data',
                'Esta página não tem dados do Elementor. Verifique se foi editada com o Elementor.',
                [ 'status' => 404 ]
            );
        }

        $data = json_decode( $raw, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            return new WP_Error( 'invalid_json', 'Os dados do Elementor estão corrompidos.', [ 'status' => 500 ] );
        }

        return $data;
    }

    /**
     * Salva os dados do Elementor de volta para uma página.
     * Retorna true em sucesso ou WP_Error.
     */
    public static function save_page_data( $page_id, $data ) {
        $encoded = wp_slash( json_encode( $data ) );
        $result  = update_post_meta( $page_id, '_elementor_data', $encoded );

        if ( $result === false ) {
            return new WP_Error( 'save_failed', 'Falha ao salvar os dados.', [ 'status' => 500 ] );
        }

        return true;
    }

    /**
     * Busca recursivamente um elemento pelo css_id dentro da árvore do Elementor.
     * Retorna referência ao elemento encontrado ou null.
     */
    public static function &find_element_by_css_id( &$elements, $css_id ) {
        static $not_found = null;

        if ( ! is_array( $elements ) ) {
            return $not_found;
        }

        foreach ( $elements as &$element ) {
            if ( ! isset( $element['settings'] ) ) {
                continue;
            }

            if (
                isset( $element['settings']['css_id'] ) &&
                $element['settings']['css_id'] === $css_id
            ) {
                return $element;
            }

            if ( ! empty( $element['elements'] ) ) {
                $found = &self::find_element_by_css_id( $element['elements'], $css_id );
                if ( null !== $found ) {
                    return $found;
                }
            }
        }

        return $not_found;
    }

    /**
     * Atualiza as settings de um elemento encontrado pelo css_id.
     * Retorna true em sucesso, WP_Error se não encontrado.
     */
    public static function update_element_settings( &$elements, $css_id, $new_settings ) {
        if ( ! is_array( $elements ) ) {
            return new WP_Error( 'invalid_structure', 'Estrutura inválida.', [ 'status' => 500 ] );
        }

        foreach ( $elements as &$element ) {
            if ( ! isset( $element['settings'] ) ) {
                continue;
            }

            if (
                isset( $element['settings']['css_id'] ) &&
                $element['settings']['css_id'] === $css_id
            ) {
                $element['settings'] = array_merge( $element['settings'], $new_settings );
                return true;
            }

            if ( ! empty( $element['elements'] ) ) {
                $result = self::update_element_settings( $element['elements'], $css_id, $new_settings );
                if ( true === $result ) {
                    return true;
                }
            }
        }

        return new WP_Error(
            'not_found',
            "Elemento com css_id '{$css_id}' não encontrado na página.",
            [ 'status' => 404 ]
        );
    }

    /**
     * Limpa o cache de arquivos do Elementor.
     */
    public static function clear_cache() {
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
            return true;
        }

        return new WP_Error( 'elementor_not_active', 'O Elementor não está ativo.', [ 'status' => 500 ] );
    }
}
