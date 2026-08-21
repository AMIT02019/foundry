<?php
/**
 * Foundry theme updater — drop this into every WordPress theme you sell.
 *
 * Usage, from the theme's functions.php:
 *
 *     require_once get_template_directory() . '/inc/class-foundry-updater.php';
 *     new Foundry_Updater( 'meridian-wp', wp_get_theme()->get( 'Version' ) );
 *
 * Handles three things:
 *   1. A Licence settings screen where the buyer pastes their key.
 *   2. Activation / deactivation against the marketplace.
 *   3. Hooking WordPress's own update check so new releases appear under
 *      Dashboard → Updates like any other theme.
 *
 * @package Foundry
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Foundry_Updater {

	const API_BASE = 'https://foundry.dev';

	private string $slug;
	private string $version;
	private string $option_key;

	public function __construct( string $slug, string $version ) {
		$this->slug       = $slug;
		$this->version    = $version;
		$this->option_key = 'foundry_license_' . $slug;

		add_filter( 'pre_set_site_transient_update_themes', array( $this, 'inject_update' ) );
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_post_foundry_save_license', array( $this, 'handle_save' ) );
		add_action( 'switch_theme', array( $this, 'release_activation' ) );
	}

	/* ------------------------------------------------------------------ */
	/* Update feed                                                        */
	/* ------------------------------------------------------------------ */

	public function inject_update( $transient ) {
		if ( empty( $transient->checked ) ) {
			return $transient;
		}

		$remote = $this->get_remote_release();
		if ( ! $remote || empty( $remote['updateAvailable'] ) ) {
			return $transient;
		}

		$transient->response[ $this->slug ] = array(
			'theme'       => $this->slug,
			'new_version' => $remote['version'],
			'url'         => self::API_BASE . '/templates/' . $this->slug,
			'package'     => $remote['packageUrl'],
		);

		return $transient;
	}

	/**
	 * Cached for six hours so a slow marketplace never slows the dashboard.
	 */
	private function get_remote_release(): ?array {
		$key = $this->get_license_key();
		if ( ! $key ) {
			return null;
		}

		$cache_key = 'foundry_release_' . $this->slug;
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return $cached ?: null;
		}

		$response = wp_remote_get(
			add_query_arg(
				array(
					'key'       => $key,
					'slug'      => $this->slug,
					'installed' => $this->version,
				),
				self::API_BASE . '/api/update-check'
			),
			array( 'timeout' => 10 )
		);

		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			set_transient( $cache_key, array(), HOUR_IN_SECONDS );
			return null;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		set_transient( $cache_key, $body, 6 * HOUR_IN_SECONDS );

		return $body;
	}

	/* ------------------------------------------------------------------ */
	/* Licence activation                                                 */
	/* ------------------------------------------------------------------ */

	private function call_license_api( string $key, string $action ): array {
		$response = wp_remote_post(
			self::API_BASE . '/api/license/activate',
			array(
				'timeout' => 15,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode(
					array(
						'key'      => $key,
						'site_url' => home_url(),
						'action'   => $action,
					)
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array(
				'ok'     => false,
				'reason' => 'connection_failed',
			);
		}

		return json_decode( wp_remote_retrieve_body( $response ), true ) ?: array( 'ok' => false );
	}

	public function release_activation(): void {
		$key = $this->get_license_key();
		if ( $key ) {
			$this->call_license_api( $key, 'deactivate' );
		}
	}

	private function get_license_key(): string {
		$stored = get_option( $this->option_key, array() );
		return $stored['key'] ?? '';
	}

	/* ------------------------------------------------------------------ */
	/* Settings screen                                                    */
	/* ------------------------------------------------------------------ */

	public function add_settings_page(): void {
		add_theme_page(
			__( 'Theme licence', 'foundry' ),
			__( 'Licence', 'foundry' ),
			'manage_options',
			'foundry-license',
			array( $this, 'render_settings_page' )
		);
	}

	public function render_settings_page(): void {
		$stored = get_option( $this->option_key, array() );
		$key    = $stored['key'] ?? '';
		$active = ! empty( $stored['active'] );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Theme licence', 'foundry' ); ?></h1>
			<p>
				<?php esc_html_e( 'Enter the licence key from your purchase page to receive updates for this theme.', 'foundry' ); ?>
			</p>

			<?php if ( $active ) : ?>
				<div class="notice notice-success inline">
					<p><?php esc_html_e( 'This site is activated. Updates will appear under Dashboard → Updates.', 'foundry' ); ?></p>
				</div>
			<?php elseif ( ! empty( $_GET['foundry_error'] ) ) : ?>
				<div class="notice notice-error inline">
					<p><?php echo esc_html( $this->explain_error( sanitize_text_field( wp_unslash( $_GET['foundry_error'] ) ) ) ); ?></p>
				</div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="foundry_save_license" />
				<input type="hidden" name="slug" value="<?php echo esc_attr( $this->slug ); ?>" />
				<?php wp_nonce_field( 'foundry_save_license_' . $this->slug ); ?>
				<table class="form-table">
					<tr>
						<th scope="row"><label for="foundry_key"><?php esc_html_e( 'Licence key', 'foundry' ); ?></label></th>
						<td>
							<input
								type="text"
								id="foundry_key"
								name="foundry_key"
								class="regular-text code"
								value="<?php echo esc_attr( $key ); ?>"
								placeholder="FNDR-XXXX-XXXX-XXXX-XXXX"
							/>
						</td>
					</tr>
				</table>
				<?php submit_button( $active ? __( 'Deactivate this site', 'foundry' ) : __( 'Activate', 'foundry' ) ); ?>
				<?php if ( $active ) : ?>
					<input type="hidden" name="foundry_action" value="deactivate" />
				<?php endif; ?>
			</form>
		</div>
		<?php
	}

	public function handle_save(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage licences.', 'foundry' ) );
		}
		check_admin_referer( 'foundry_save_license_' . $this->slug );

		$key    = sanitize_text_field( wp_unslash( $_POST['foundry_key'] ?? '' ) );
		$action = ( 'deactivate' === ( $_POST['foundry_action'] ?? '' ) ) ? 'deactivate' : 'activate';
		$result = $this->call_license_api( $key, $action );

		if ( empty( $result['ok'] ) ) {
			wp_safe_redirect(
				add_query_arg(
					array(
						'page'           => 'foundry-license',
						'foundry_error'  => rawurlencode( $result['reason'] ?? 'unknown' ),
					),
					admin_url( 'themes.php' )
				)
			);
			exit;
		}

		update_option(
			$this->option_key,
			array(
				'key'    => $key,
				'active' => 'activate' === $action,
			)
		);
		delete_transient( 'foundry_release_' . $this->slug );

		wp_safe_redirect( admin_url( 'themes.php?page=foundry-license' ) );
		exit;
	}

	private function explain_error( string $reason ): string {
		$messages = array(
			'unknown_key'               => __( 'That key does not match any purchase. Check it against your purchase page.', 'foundry' ),
			'activation_limit_reached'  => __( 'This licence is already in use on the maximum number of sites. Deactivate one, or buy another licence.', 'foundry' ),
			'expired'                   => __( 'The support window on this licence has ended. Renew to receive new versions.', 'foundry' ),
			'revoked'                   => __( 'This licence has been revoked.', 'foundry' ),
			'connection_failed'         => __( 'Could not reach the licence server. Try again in a moment.', 'foundry' ),
		);

		return $messages[ $reason ] ?? __( 'Activation failed.', 'foundry' );
	}
}
