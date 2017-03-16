var webpack = require('webpack');
var path = require('path');

module.exports = {
  entry: './src/index',
  output: {
    filename: 'dist/ReactProxy.js',
    libraryTarget: 'umd',
    library: 'ReactProxy'
  },
  externals: [{
    react: {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react',
    },
    jsdom: 'window',
    cheerio: 'window',
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': 'window',
    'text-encoding': 'window'
  }],
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel', include: path.join(__dirname, 'src') }
    ]
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin()
  ]
};
