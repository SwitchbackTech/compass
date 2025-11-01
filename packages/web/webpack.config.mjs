import dotenv from "dotenv";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { resolve as _resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const _dirname = dirname(__filename);
const resolvePath = (p) => _resolve(_dirname, p);

const loadEnvFile = (envName) => {
  const map = {
    local: ".env.local",
    staging: ".env.staging",
    production: ".env.production",
    test: null, // test environment doesn't require env file
  };

  const envFile = map[envName];

  // Skip file loading for test environment or if file is explicitly null
  if (envName === "test" || envFile === null) {
    console.log(
      `Skipping env file load for ${envName} environment (using process.env)`,
    );
    return;
  }

  const fullPath = _resolve(
    _dirname,
    "..",
    "..",
    "packages",
    "backend",
    envFile,
  );

  if (fs.existsSync(fullPath)) {
    console.log(`Creating a ${envName} build using ${envFile} ...`);
    dotenv.config({ path: fullPath, override: true });
  } else {
    // Only warn, don't exit - allow environment variables to be provided via process.env (e.g., in CI)
    console.warn(
      `Warning: Env file not found: ${fullPath}. Using environment variables from process.env`,
    );
  }
};

export default (env, argv) => {
  const IS_DEV = argv.mode === "development";

  const ENVIRONMENT = argv.nodeEnv || 'local';
  loadEnvFile(ENVIRONMENT);

  const GLOBAL_SCSS = resolvePath("src/common/styles/index.scss");

  const ANALYZE_BUNDLE = env.analyze;
  const API_BASEURL =
    process.env.API_BASEURL || `http://localhost:${process.env.PORT || 3000}`;
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const POSTHOG_KEY = process.env.POSTHOG_KEY;
  const POSTHOG_HOST = process.env.POSTHOG_HOST;
  const NODE_ENV = process.env.NODE_ENV || ENVIRONMENT || "development";
  const PORT = process.env.PORT || "3000";

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "undefined") {
    console.error(`Oopsies, you're missing the GOOGLE_CLIENT_ID variable.
      Make sure you include all required environment variables in the .env file.
      Reference: https://docs.compasscalendar.com/docs/get-started/setup
    `);
    process.exit(1);
  }

  const sassLoader = {
    loader: "sass-loader",
    options: {
      additionalData: `@import '${GLOBAL_SCSS}';`,
    },
  };

  const styleLoader = IS_DEV ? "style-loader" : MiniCssExtractPlugin.loader;

  const envObject = `{
    API_BASEURL: ${JSON.stringify(API_BASEURL)},
    GOOGLE_CLIENT_ID: ${JSON.stringify(GOOGLE_CLIENT_ID)},
    POSTHOG_KEY: ${JSON.stringify(POSTHOG_KEY || "undefined")},
    POSTHOG_HOST: ${JSON.stringify(POSTHOG_HOST || "undefined")},
    NODE_ENV: ${JSON.stringify(NODE_ENV)},
    PORT: ${JSON.stringify(PORT)}
  }`;

  const _plugins = [
    new webpack.DefinePlugin({
      // Define process.env as an object literal (not a JSON string)
      // This allows both process.env.KEY and process.env["KEY"] bracket notation to work
      "process.env": envObject,
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      hash: true,
      template: "./src/index.html",
      favicon: "./src/favicon.ico",
    }),
    // minify css
    new MiniCssExtractPlugin({
      filename: IS_DEV ? "[name].css" : "[name].[contenthash].css",
      chunkFilename: IS_DEV ? "[id].css" : "[id].[contenthash].css",
    }),
  ];

  if (ANALYZE_BUNDLE) {
    _plugins.push(new BundleAnalyzerPlugin());
  }

  return {
    entry: "./src/index.tsx",
    // got devtool sourcemap errors with: eval, eval-cheap-source-map
    devtool: IS_DEV ? "cheap-module-source-map" : "source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
              rootMode: "upward",
            },
          },
          exclude: /node_modules/,
        },
        // css/scss
        {
          test: /\.css/,
          use: [
            styleLoader,
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  config: _resolve(_dirname, "postcss.config.js"),
                },
              },
            },
          ],
        },

        {
          test: /\.scss$/,
          exclude: /\.module.(s(a|c)ss)$/,
          use: [styleLoader, "css-loader", sassLoader],
        },
        {
          test: /\.module.(s(a|c)ss)$/,
          use: [
            styleLoader,
            {
              loader: "css-loader",
              options: {
                modules: {
                  auto: true,
                  localIdentName: IS_DEV
                    ? "[path]:[local]--[contenthash:base64:5]"
                    : "[contenthash:base64:5]",
                },
              },
            },
            sassLoader,
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
        {
          test: /\.svg$/,
          oneOf: [
            { issuer: /\.[jt]sx?$/, use: ["@svgr/webpack"] },
            { type: "asset/resource" },
          ],
        },
      ],
    },

    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      modules: [_resolve("./src"), "node_modules"],
      alias: {
        "@core": resolvePath("../core/src"),
        "@web/assets": resolvePath("./src/assets"),
        "@web/auth": resolvePath("./src/auth"),
        "@web/backend": resolvePath("../backend/src"),
        "@web/common": resolvePath("./src/common"),
        "@web/components": resolvePath("./src/components"),
        "@web/containers": resolvePath("./src/containers"),
        "@web/ducks": resolvePath("./src/ducks/"),
        "@web/public": resolvePath("./src/public"),
        "@web/routers": resolvePath("./src/routers"),
        "@web/store": resolvePath("./src/store"),
        "@web/socket": resolvePath("./src/socket"),
        "@web/views": resolvePath("./src/views"),
      },
    },

    output: {
      clean: true,
      filename: "[name].[contenthash].js",
      path: `${_resolve(_dirname, "../../build/web")}`,
    },

    devServer: {
      static: {
        directory: join(_dirname, "public"),
      },
      watchFiles: {
        paths: ["src/**/*"],
        options: {
          usePolling: false,
          ignored: ["**/*.test.*"],
        },
      },
      compress: true,
      port: 9080,
      historyApiFallback: true,
    },

    plugins: _plugins,
  };
};
