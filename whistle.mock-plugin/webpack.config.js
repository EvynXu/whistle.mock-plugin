const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const packageJson = require('./package.json');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './ui/src/index.js',
  output: {
    path: path.resolve(__dirname, 'app/public'),
    filename: 'js/index.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './ui/src/index.html',
      filename: 'index.html'
    }),
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(packageJson.version)
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'app/public')
    },
    port: 8080,
    hot: true,
    proxy: {
      '/api': 'http://localhost:8899'
    }
  }
}; 