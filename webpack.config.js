const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      editor: './modules/loop-builder/assets/js/editor/module.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'assets/js'),
      filename: isProduction ? '[name].min.js' : '[name].js',
      clean: false
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false,
              drop_debugger: true
            },
            mangle: {
              reserved: ['elementor', 'elementorModules', '$e', 'jQuery', '$']
            },
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ]
    },
    
    resolve: {
      alias: {
        'elementor-pro': path.resolve(__dirname, './'),
        '@': path.resolve(__dirname, './')
      }
    },
    
    externals: {
      'jquery': 'jQuery',
      'elementor': 'elementor',
      'elementorModules': 'elementorModules',
      '$e': '$e'
    },
    
    devtool: isProduction ? false : 'source-map',
    
    stats: {
      colors: true,
      modules: false,
      chunks: false,
      chunkModules: false
    }
  };
};
