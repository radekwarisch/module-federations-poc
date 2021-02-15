const isProd = (process.env.NODE_ENV === 'production');

module.exports = {
  cache: false,
  mode: isProd ? "development" : "production",
  devtool: "source-map",

  optimization: {
    minimize: isProd,
  },
  resolve: {
    extensions: [".jsx", ".js", ".json"],
  },

  module: {
    rules: [
      {
        test: /\.m?js/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
}