const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: path.resolve(__dirname, 'src/index.jsx'),
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader'
      }
    }, {
      test: /\.scss$/,
      use: [{
        loader: 'style-loader'
      }, {
        loader: 'css-loader'
      }, {
        loader: 'sass-loader'
      }]
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Phonograph',
      template: 'src/index.ejs'
    }),
    new CopyWebpackPlugin([{
      from: 'data',
      to: 'data'
    }])
  ],
  "resolve": {
    "alias": {
      "react": "preact/compat",
      "react-dom": "preact/compat"
    },
  }
};
