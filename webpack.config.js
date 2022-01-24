const path = require("path");

module.exports = {
  entry: {
    app: [
      "whatwg-fetch",
      path.resolve(__dirname, "assets", "app", "js", "index.js"),
      path.resolve(__dirname, "assets", "app", "scss", "styles.scss"),
    ],
  },

  output: {
    filename: path.join("[name]", "js", "main.js"),
    path: path.resolve(__dirname, "public"),
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
      {
        test: /app\/scss\/styles\.scss$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "app/css/styles.css",
            },
          },
          "postcss-loader",
          "sass-loader",
        ],
      },
    ],
  },
};
