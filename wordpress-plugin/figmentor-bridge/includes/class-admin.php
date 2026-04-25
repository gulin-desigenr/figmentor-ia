<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Figmentor_Bridge_Admin {

    const OPTION_KEY  = 'figmentor_bridge_api_token';
    const NONCE_ACTION = 'figmentor_bridge_token_action';

    public function init() {
        add_action( 'admin_menu', [ $this, 'register_menu' ] );
        add_action( 'admin_init', [ $this, 'handle_form' ] );
        add_action( 'admin_head', [ $this, 'inline_styles' ] );
    }

    public function register_menu() {
        add_options_page(
            'Figmentor Bridge',
            'Figmentor Bridge',
            'manage_options',
            'figmentor-bridge',
            [ $this, 'render_page' ]
        );
    }

    /**
     * Processa ações de formulário (gerar, regenerar e revogar token).
     * Executado antes do output HTML para permitir redirect.
     */
    public function handle_form() {
        if ( ! isset( $_POST['figmentor_action'] ) ) {
            return;
        }

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Acesso negado.' );
        }

        check_admin_referer( self::NONCE_ACTION );

        $action = sanitize_text_field( $_POST['figmentor_action'] );

        if ( $action === 'generate' || $action === 'regenerate' ) {
            $token = bin2hex( random_bytes( 32 ) );
            update_option( self::OPTION_KEY, $token, false );
            wp_redirect( add_query_arg( [ 'page' => 'figmentor-bridge', 'token_generated' => '1' ], admin_url( 'options-general.php' ) ) );
            exit;
        }

        if ( $action === 'revoke' ) {
            delete_option( self::OPTION_KEY );
            wp_redirect( add_query_arg( [ 'page' => 'figmentor-bridge', 'token_revoked' => '1' ], admin_url( 'options-general.php' ) ) );
            exit;
        }
    }

    public static function get_token() {
        return get_option( self::OPTION_KEY, '' );
    }

    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $token    = self::get_token();
        $has_token = ! empty( $token );
        $site_url = get_rest_url( null, 'figmentor/v1' );
        ?>
        <div class="wrap">
            <h1>Figmentor Bridge — Configurações de API</h1>

            <?php if ( isset( $_GET['token_generated'] ) ) : ?>
                <div class="notice notice-success is-dismissible"><p><strong>Token gerado com sucesso.</strong> Use os botões abaixo para revelar ou copiar o valor quando precisar.</p></div>
            <?php endif; ?>

            <?php if ( isset( $_GET['token_revoked'] ) ) : ?>
                <div class="notice notice-warning is-dismissible"><p>Token revogado. A autenticação por token foi desativada até que um novo token seja gerado.</p></div>
            <?php endif; ?>

            <h2>Status da autenticação</h2>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">Status</th>
                    <td>
                        <?php if ( $has_token ) : ?>
                            <span style="color:#0a6b0a;font-weight:600;">&#10003; Token ativo</span>
                        <?php else : ?>
                            <span style="color:#b32d2e;font-weight:600;">&#10007; Nenhum token gerado — autenticação por token indisponível</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php if ( $has_token ) : ?>
                <tr>
                    <th scope="row">Token atual</th>
                    <td>
                        <div class="figmentor-token-box">
                            <input
                                type="password"
                                id="figmentor-token-field"
                                value="<?php echo esc_attr( $token ); ?>"
                                readonly
                                style="width:420px;font-family:monospace;"
                            />
                            <button type="button" class="button" onclick="
                                var f = document.getElementById('figmentor-token-field');
                                f.type = f.type === 'password' ? 'text' : 'password';
                                this.textContent = f.type === 'password' ? 'Revelar' : 'Ocultar';
                            ">Revelar</button>
                            <button type="button" class="button" onclick="
                                var f = document.getElementById('figmentor-token-field');
                                var prev = f.type; f.type = 'text';
                                f.select(); document.execCommand('copy');
                                f.type = prev;
                                this.textContent = 'Copiado!';
                                var btn = this;
                                setTimeout(function(){ btn.textContent = 'Copiar'; }, 2000);
                            ">Copiar</button>
                        </div>
                        <p class="description">Envie este token no header <code>X-Figmentor-Token: &lt;token&gt;</code> em todas as requisições à API.</p>
                    </td>
                </tr>
                <?php endif; ?>
                <tr>
                    <th scope="row">Base URL da API</th>
                    <td>
                        <code><?php echo esc_html( $site_url ); ?></code>
                        <p class="description">Prefixo para todos os endpoints REST do Figmentor Bridge.</p>
                    </td>
                </tr>
            </table>

            <h2>Gerenciar token</h2>
            <form method="post">
                <?php wp_nonce_field( self::NONCE_ACTION ); ?>
                <?php if ( ! $has_token ) : ?>
                    <input type="hidden" name="figmentor_action" value="generate" />
                    <?php submit_button( 'Gerar token de API', 'primary', 'submit', false ); ?>
                <?php else : ?>
                    <input type="hidden" name="figmentor_action" value="regenerate" />
                    <?php submit_button( 'Regenerar token (invalida o atual)', 'secondary', 'submit', false ); ?>
                    &nbsp;
                <?php endif; ?>
            </form>
            <?php if ( $has_token ) : ?>
            <form method="post" style="display:inline;" onsubmit="return confirm('Isso revogará o token atual imediatamente. Confirmar?');">
                <?php wp_nonce_field( self::NONCE_ACTION ); ?>
                <input type="hidden" name="figmentor_action" value="revoke" />
                <?php submit_button( 'Revogar token', 'delete', 'submit', false ); ?>
            </form>
            <?php endif; ?>

            <hr>
            <h2>Uso da API — referência rápida</h2>
            <p>Substitua <code>{TOKEN}</code>, <code>{SITE}</code> e <code>{PAGE_ID}</code> pelos valores reais.</p>
            <pre class="figmentor-code-block"><?php
$examples = <<<'BASH'
# Ler estrutura Elementor de uma página
curl -s \
  -H "X-Figmentor-Token: {TOKEN}" \
  "{SITE}/wp-json/figmentor/v1/pages/{PAGE_ID}"

# Atualizar settings de um widget pelo css_id
curl -s -X PUT \
  -H "X-Figmentor-Token: {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"background_color":"rgba(255,0,0,1)"}}' \
  "{SITE}/wp-json/figmentor/v1/pages/{PAGE_ID}/widgets/{CSS_ID}"

# Limpar cache do Elementor
curl -s -X POST \
  -H "X-Figmentor-Token: {TOKEN}" \
  "{SITE}/wp-json/figmentor/v1/pages/{PAGE_ID}/cache/clear"
BASH;
echo esc_html( $examples );
?></pre>

            <hr>
            <h2>Segurança</h2>
            <ul>
                <li>O token é armazenado na tabela <code>wp_options</code>, acessível apenas por usuários com acesso direto ao banco de dados ou ao painel WordPress com <code>manage_options</code>.</li>
                <li>Sempre use HTTPS. Nunca exponha o token em logs ou arquivos de configuração versionados.</li>
                <li>Regenere o token se suspeitar de comprometimento.</li>
            </ul>
        </div>
        <?php
    }

    public function inline_styles() {
        $screen = get_current_screen();
        if ( ! $screen || $screen->id !== 'settings_page_figmentor-bridge' ) {
            return;
        }
        echo '<style>
            .figmentor-token-box { display:flex; gap:6px; align-items:center; }
            .figmentor-code-block {
                background:#1e1e1e; color:#d4d4d4;
                padding:16px; border-radius:4px;
                font-size:13px; line-height:1.6;
                overflow-x:auto; white-space:pre;
            }
        </style>';
    }
}
