const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

const deps = require("./package.json").dependencies;

const baseConfig = require('../../webpack.config.base');

const isProd = true//(process.env.NODE_ENV === 'production');

module.exports = {
  ...baseConfig,
  entry: "./src/index",
  output: {
    publicPath: isProd ? "http://rwarisch-module-federation-search.s3-website.eu-central-1.amazonaws.com/" : "http://localhost:3003/",
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "search",
      filename: "remoteEntry.js",
      remotes: {
        home: isProd ? "home@http://rwarisch-module-federation-home.s3-website.eu-central-1.amazonaws.com/remoteEntry.js" : "home@http://localhost:3001/remoteEntry.js",
        profile: isProd ? "profile@http://rwarisch-module-federation-profile.s3-website.eu-central-1.amazonaws.com/remoteEntry.js" : "profile@http://localhost:3002/remoteEntry.js",
        search: isProd ? "search@http://rwarisch-module-federation-search.s3-website.eu-central-1.amazonaws.com/remoteEntry.js" : "search@http://localhost:3003/remoteEntry.js",
      },
      exposes: {
        "./Search": "./src/Search",
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],

  devServer: {
    port: 3003,
    historyApiFallback: true,
  },
};
