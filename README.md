# webpack-easy

## Example of usage

```js
const webpackEasy = require('webpack-easy');
const HtmlWebpackPlugin = require('html-webpack-plugin');

webpackEasy
    .entry({
      style: './frontend/less/index.less',
      app: './app/index.js',
    })
    .output({
      path: `${__dirname}/public/`,
      filename: 'assets/bundle-[name]-[hash].js',
      chunkFilename: 'assets/bundle-[name]-[hash].js',
    })
    .config({
      resolve: {
        root: __dirname,
        alias: {
          actions: 'app/actions',
          components: 'app/components',
        },
        extensions: ['', '.js']
      },
    })
    .serverConfig({
      contentBase: './public',
      historyApiFallback: true,
    })
    .loader({
      test: /\.[ot]tf$/,
      loader: 'url',
      query: {
        limit: 10000,
        mimetype: 'application/octet-stream',
        name: 'fonts/[name].[ext]'
      }
    })
    .loaderFont(false)
    .plugin(new HtmlWebpackPlugin({
      template: 'app/index.html',
      filename: 'index.html',
      inject: false,
      chunks: false,
    }));
```

## Multiple configs

```js
const webpackEasy = require('webpack-easy');
const HtmlWebpackPlugin = require('html-webpack-plugin');

webpackEasy
    .serverConfig({
      contentBase: './public',
      historyApiFallback: true,
    })
    
webpackEasy
    .createConfig()
    .entry({
      style: './frontend/less/index.less',
      app: './app/index.js',
    })
    .output({
      path: `${__dirname}/public/`,
      filename: 'assets/bundle-[name]-[hash].js',
      chunkFilename: 'assets/bundle-[name]-[hash].js',
    });
    
webpackEasy
    .createConfig()
    .entry({
      calendar: './widget/index.js',
    })
    .output({
      path: `${__dirname}/public/widget/`,
      filename: 'bundle-[name]-[hash].js',
      chunkFilename: 'bundle-[name]-[hash].js',
    });
```