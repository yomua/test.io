import { defineConfig } from 'umi'
import path from 'path'
import Dotenv from 'dotenv'

import routes from './routes'

// umi 进行打包, 读取此文件配置 webpack 时, 额外注入 '../.env' 到 process.env
const getEnvConfig = () => {
    Dotenv.config({ path: path.resolve(__dirname, '../.env') })
    return process.env
}

export default defineConfig({
    publicPath: '/',
    title: 'Yomua',
    favicon: '/assets/favicon.png',
    devtool: 'source-map',
    routes,
    fastRefresh: {},
    // 开启文件 hash 后缀
    hash: true,
    // mfsu 可能会造成一些 bug
    mfsu: {},
    // 使用 hash: 避免部署到 github pages 时，当地址为 /feature/article 或其他没有 html 的路由时，刷新页面 404 的问题。
    // 使用 browser, github pages 需要做一些特别的操作
    // => 即: 需要为 github pages 导航不到对应的路由时, 设置一个 404.html, 然后再跳转回来即可.
    history: {
        type: 'browser',
    },
    // 加载时显示的 loading，当存在这个配置时，将启用按需加载。
    dynamicImport: {
        loading: '@/component/loading',
    },
    nodeModulesTransform: {
        type: 'none',
    },
    alias: {
        // 使用此别名是为了将 ~ 视为项目根目录，对应 tsconfig.json - paths 的配置
        '~': path.resolve(__dirname, '../'),
    },
    // 使用 webpack 5
    webpack5: {},
    // 全局注入 less 文件
    lessLoader: {
        // Reference： https://juejin.cn/s/less-loader%20modifyvars%20hack
        modifyVars: {
            hack: 'true; @import "~@/assets/less/_index.less";',
        },
    },
    proxy: {
        // 访问目录是 /mock 的接口时，将被代理到 'http://heymock.uneedcode.com'
        '/mock': {
            target: 'http://heymock.uneedcode.com',
            changeOrigin: true,
            pathRewrite: { '^/mock': '' }, // 去除请求路径中的 `/mock` (在浏览器显示的时候不并不会去除, 但是实际上到服务端时已经去除)
        },
    },
    chainWebpack(config, { env, webpack, createCSSRule }) {
        // 配置 Markdown Loader
        config.module
            .rule('compile')
            .test(/\.html$/i)
            .use('html-loader')
            .loader('html-loader')
            .end()
            .rule('markdown')
            .test(/\.md$/)
            .use('html-loader')
            .loader('html-loader')
            .end()
            .use('markdown-loader')
            .loader('markdown-loader')
            .options({
                // Pass options to marked
                // See https://marked.js.org/using_advanced#options
                // For example, if you want to use a custom renderer:
                // renderer: new marked.Renderer(),
            })
            .end()

        const umiEnv = process.env

        // 注入 .env 中的配置到 process.env, 同时保留 umi env
        // 这样就可以在运行时(跑到浏览器的时候)使用 process.env 获取对应的变量
        config.plugin('define').use(webpack.DefinePlugin, [
            {
                'process.env': JSON.stringify({ ...getEnvConfig(), ...umiEnv }),
            },
        ])

        return config
    },
})
