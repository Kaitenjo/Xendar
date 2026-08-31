import { PackageJson } from 'type-fest';

/**
 * Supported build targets for Xaendar packages.
 */
export type XaendarTarget = 'browser' | 'node' | 'extension';

/**
 * Extension of `PackageJson` with Xaendar-specific build settings.
 */
export type XaendarPackageJson = PackageJson & {
  /**
   * Custom field used to configure the build process for each package.
   */
  xaendar?: {
    /**
     * The intended runtime environment for the package, which determines
     * the build tool and output format. Defaults to `browser`.
     */
    target: XaendarTarget;
    /**
     * Entry point relative to the package root.
     * Defaults to `src/public-api.ts`.
     */
    entry?: string;
    /**
     * Whether to emit `.d.ts` declaration files.
     * Defaults to `true`.
     */
    dts?: boolean;
    /**
     * Whether to build this package.
     * Set to `false` for internal packages that are bundled inline
     * by their consumer (for example, compiler bundled into CLI).
     */
    build?: boolean;
    /**
     * If `true`, all dependencies are bundled inline (not externalized).
     * Used for CLI executables that should be self-contained.
     */
    executable?: boolean;
    /**
     * Whether to generate source maps for the output files.
     * Defaults to `true`.
     */
    sourceMap?: boolean;
  };
};
