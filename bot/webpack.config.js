const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    floatWindow: './src/renderer/floatWindow/index.tsx',
    chatWindow: './src/renderer/chatWindow/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false,
    }
  },
  // 忽略 opus-encdec 的警告
  ignoreWarnings: [
    {
      module: /opus-encdec/,
      message: /Critical dependency/,
    },
  ],
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/floatWindow/index.html',
      filename: 'floatWindow.html',
      chunks: ['floatWindow'],
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/chatWindow/index.html',
      filename: 'chatWindow.html',
      chunks: ['chatWindow'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets', noErrorOnMissing: true },
        // 复制本地 Pyodide 文件（如果存在）
        { from: 'public/pyodide', to: 'pyodide', noErrorOnMissing: true },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
    hot: true,
  },
};
