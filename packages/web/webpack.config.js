const path = require("path");
const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

const _dirname = path.resolve();
const resolvePath = (p) => path.resolve(_dirname, p);

module.exports = (env, argv) => {
  const GLOBAL_SCSS = resolvePath("src/common/styles/index.scss");

  const ANALYZE_BUNDLE = env.analyze;
  const API_BASEURL = env.API_BASEURL;
  const API_BASEURL_SYNC = env.API_BASEURL_SYNC;
  const IS_DEV = argv.mode === "development";
  const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;

  if (!argv.mode || !API_BASEURL || !API_BASEURL_SYNC || !GOOGLE_CLIENT_ID) {
    console.error("oopsies, you didn't include an required env variable");
    return;
  }

  const sassLoader = {
    loader: "sass-loader",
    options: {
      additionalData: `@import '${GLOBAL_SCSS}';`,
    },
  };

  const styleLoader = IS_DEV ? "style-loader" : MiniCssExtractPlugin.loader;

  const _plugins = [
    new DefinePlugin({
      "process.env.API_BASEURL": JSON.stringify(API_BASEURL),
      "process.env.API_BASEURL_SYNC": JSON.stringify(API_BASEURL_SYNC),
      "process.env.GOOGLE_CLIENT_ID": JSON.stringify(GOOGLE_CLIENT_ID),
    }),
    new HtmlWebpackPlugin({
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
          use: [styleLoader, "css-loader"],
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
      modules: [path.resolve("./src"), "node_modules"],
      alias: {
        "@core": resolvePath("../core/src"),
        "@web/assets": resolvePath("./src/assets"),
        "@web/backend": resolvePath("../backend/src"),
        "@web/common": resolvePath("./src/common"),
        "@web/components": resolvePath("./src/components"),
        "@web/containers": resolvePath("./src/containers"),
        "@web/ducks": resolvePath("./src/ducks/"),
        "@web/public": resolvePath("./src/public"),
        "@web/routers": resolvePath("./src/routers"),
        "@web/store": resolvePath("./src/store"),
        "@web/views": resolvePath("./src/views"),
      },
    },

    output: {
      filename: "bundle.js",
      path: `${path.resolve(_dirname, "../../build/web")}`,
    },

    devServer: {
      static: {
        directory: path.join(_dirname, "public"),
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
    },

    plugins: _plugins,
  };
};
