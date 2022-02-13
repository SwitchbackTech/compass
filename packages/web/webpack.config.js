const path = require("path");
const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

// $$ change this for dirs like /Components, which have diff conventions (?)
// $$ only if having same import issues on bundle
const resolvePath = (p) => path.resolve(__dirname, p);

module.exports = (env) => {
  const GLOBAL_SCSS = resolvePath("src/common/styles/index.scss");

  const isDevelopment = env.development;
  const isProduction = env.production;
  const analyzeBundle = env.analyze;

  if (!isDevelopment && !isProduction) {
    console.log("oopsies, looks like you didn't include an env variable");
    return;
  }

  const sassLoader = {
    loader: "sass-loader",
    options: {
      additionalData: `@import '${GLOBAL_SCSS}';`,
    },
  };

  const styleLoader = isDevelopment
    ? "style-loader"
    : MiniCssExtractPlugin.loader;

  const _plugins = [
    new DefinePlugin({
      "process.env.NODE_ENV": isProduction
        ? JSON.stringify("production")
        : JSON.stringify("development"),
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      favicon: "./src/favicon.ico",
    }),
    // minify css
    new MiniCssExtractPlugin({
      filename: isDevelopment ? "[name].css" : "[name].[contenthash].css",
      chunkFilename: isDevelopment ? "[id].css" : "[id].[contenthash].css",
    }),
  ];

  if (isProduction && analyzeBundle) {
    _plugins.push(new BundleAnalyzerPlugin());
  }

  return {
    entry: "./src/index.tsx",
    // got devtool sourcemap errors when using eval, eval-cheap-source-map
    devtool: isDevelopment ? "cheap-module-source-map" : "source-map",
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
                  localIdentName: isDevelopment
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
      path: resolvePath("build"),
    },

    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      watchFiles: {
        paths: ["src/**/*"],
        options: {
          usePolling: false,
        },
      },
      compress: true,
      port: 9080,
    },

    plugins: _plugins,
  };
};
