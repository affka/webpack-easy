'use strict';

var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var glob = require('glob');
var path = require('path');
var _ = require('lodash');

class WebpackEasy {

    constructor() {
        this._entries = {};
        this._output = {
            path: `${process.cwd()}/public`,
            publicPath: '/',
            filename: 'assets/[name].js'
        };
        this._config = {};
        this._serverConfig = {};
        this._promises = [];

        this._isProduction = null;
        this._port = null;

        this._loaders = {
            js: {
                test: /\.jsx?$/,
                loaders: {
                    'react-hot': 'react-hot',
                    babel: 'babel?' + JSON.stringify({
                        cacheDirectory: true,
                        plugins: this.isProduction() ? ['babel-plugin-transform-runtime'] : '',
                        presets: ['es2015', 'stage-1', 'react']
                    })
                },
                exclude: /node_modules/
            },
            eslint: {
                test: /\.jsx?$/,
                loader: 'eslint',
                exclude: /node_modules/,
            },
            json: {
                test: /\.json$/,
                loader: 'json'
            },
            less: {
                test: /\.less$/,
                loaders: ['style', 'css', 'less']
            },
            font: {
                test: /\/fonts\/.*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                loader: 'file-loader',
                query: {
                    name: 'fonts/[name].[ext]'
                }
            }
        };
        this._loadersNames = Object.keys(this._loaders);
        this._plugins = [
            this.isProduction() && new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: '"production"'
                }
            }),
            this.isProduction() && new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                }
            }),
            !this.isProduction() && new webpack.HotModuleReplacementPlugin()
        ];

        setTimeout(this._run.bind(this));
    }

    /**
     *
     * @param {string|string[]|object|function} source
     * @param {string} [destination]
     * @returns {WebpackEasy}
     */
    entry(source, destination = 'index') {

        if (_.isString(source)) {
            return this.entry([source], destination);
        }
        if (_.isFunction(source)) {
            return source.call(this);
        }

        _.each(source, (paths, key) => {
            if (_.isString(key)) {
                destination = key;
            }

            this._entries[destination] = this._entries[destination] || [];
            this._promises.push(
                Promise.all(
                    [destination].concat([].concat(paths).map(path => this.glob(path)))
                ).then(result => {
                    const dest = result.shift();
                    result.forEach(p => {
                        this._entries[dest] = this._entries[dest].concat(p);
                    });
                })
            );
        });

        return this;
    }

    /**
     * @param {string|object} rootPath
     * @param {string} [publicPath]
     * @returns {WebpackEasy}
     */
    output(rootPath, publicPath) {
        if (_.isString(rootPath)) {
            rootPath = {
                path: path.resolve(process.cwd(), rootPath)
            };
        }
        if (publicPath) {
            rootPath.publicPath = publicPath;
        }

        // Split to path and file name
        if (rootPath.publicPath) {
            var params = path.parse(rootPath.publicPath);
            if (params.base) {
                rootPath.dir = params.dir;
                rootPath.filename = params.base;
            }
        }

        this._output = _.merge(this._output, rootPath);
        return this;
    }

    plugin(value) {
        this._plugins = this._plugins.concat(value);
        return this;
    }

    /**
     * @param {number} value
     * @returns {WebpackEasy}
     */
    port(value) {
        this._port = value;
        return this;
    }

    /**
     * @param {object} value
     * @returns {WebpackEasy}
     */
    config(value) {
        this._config = value;
        return this;
    }

    /**
     * @param {object} value
     * @returns {WebpackEasy}
     */
    serverConfig(value) {
        this._serverConfig = value;
        return this;
    }

    /**
     * @param {object} value
     * @param {boolean} prepend
     * @returns {WebpackEasy}
     */
    loader(value, prepend = false) {
        return this._loader(_.uniqueId('loader'), value, prepend);
    }

    /**
     * @param {object|boolean} value
     * @returns {WebpackEasy}
     */
    loaderJs(value) {
        return this._loader('js', value);
    }

    /**
     * @param {object|boolean} value
     * @returns {WebpackEasy}
     */
    loaderEslint(value) {
        return this._loader('eslint', value);
    }

    /**
     * @param {object|boolean} value
     * @returns {WebpackEasy}
     */
    loaderJson(value) {
        return this._loader('json', value);
    }

    /**
     * @param {object|boolean} value
     * @returns {WebpackEasy}
     */
    loaderLess(value) {
        return this._loader('less', value);
    }

    /**
     * @param {object|boolean} value
     * @returns {WebpackEasy}
     */
    loaderFont(value) {
        return this._loader('font', value);
    }

    /**
     * Check `production` or `--production` in cli arguments
     * @returns {boolean}
     */
    isProduction() {
        if (this._isProduction === null) {
            this._isProduction = process.argv.splice(2).filter(a => a.match(/(--)?production/) !== null).length > 0;
        }
        return this._isProduction;
    }

    /**
     * Generate port by project name
     * @returns {string}
     */
    getPort() {
        if (this._port === null) {
            this._port = path.basename(process.cwd())
                .split('')
                .reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0)
                .toString()
                .replace(/^-|/, '5')
                .replace(/([0-9]{4}).*/, '$1');
        }
        return this._port;
    }

    /**
     *
     * @param {string} pattern
     * @returns {Promise}
     */
    glob(pattern) {
        return new Promise((resolve, reject) => {
            glob(pattern, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }

    _run() {
        Promise.all(this._promises).then(() => {
            // Webpack config
            let config = {
                entry: this._entries,
                output: _.merge({}, this._output, {
                    publicPath: this.isProduction() ?
                        this._output.publicPath :
                    'http://localhost:' + this.getPort() + this._output.publicPath,
                }),
                devtool: this.isProduction() ? 'sourcemap' : 'eval',
                module: {
                    loaders: this._loadersNames.map(v => this._loaders[v]).filter(v => v).map(loader => {
                        if (_.isObject(loader.loaders)) {
                            loader.loaders = _.values(loader.loaders);
                        }
                        return loader;
                    })
                },
                plugins: this._plugins.filter(v => v),
            };

            // Configuration for dev server
            let serverConfig = {
                hot: true,
                inline: true,
                contentBase: this._output.path,
                historyApiFallback: true,
                /*proxy: {
                    '**': 'http://localhost'
                },*/
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                stats: {
                    chunks: false,
                    colors: true
                }
            };

            Object.keys(this._entries).forEach(key => {
                config.entry[key] = []
                    .concat(this._entries[key])
                    .concat(!this.isProduction() ? 'webpack/hot/only-dev-server' : []);
            });

            // Add hot replacement modules
            if (!this.isProduction()) {

                var indexKey = _.has(this._entries, 'index') ? 'index' : _.head(Object.keys(this._entries));
                if (indexKey) {
                    config.entry[indexKey].push(`webpack-dev-server/client?http://localhost:${this.getPort()}/`);
                }
            }

            // Merge with custom config
            config = _.merge(config, this._config);
            serverConfig = _.merge(serverConfig, this._serverConfig);

            // Run
            if (this.isProduction()) {
                webpack(config, (err, stats) => {
                    if (err) {
                        throw new Error(err);
                    }
                    console.error(stats.compilation.errors.map(e => String(e)).join('\n'));
                });
            } else {
                new WebpackDevServer(
                    webpack(config),
                    serverConfig
                ).listen(this.getPort(), 'localhost', err => {
                    if (err) {
                        throw new Error(err);
                    }
                    console.log('Listening at http://localhost:' + this.getPort());
                });
            }
        })
            .catch(e => console.log(e));
    }

    _loader(name, value, prepend) {
        this._loaders[name] = value ? _.merge(this._loaders[name] || {}, value) : false;
        if (prepend) {
            this._loadersNames.unshift(name);
        } else {
            this._loadersNames.push(name);
        }
        return this;
    }

}

module.exports = new WebpackEasy();