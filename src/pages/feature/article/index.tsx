import { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { Tree, Skeleton } from 'antd'

import classnames from '~/packages/y-classnames'
import EventEmitter from '~/packages/y-eventmitter'

import { useTheme, useWindowEventListen } from '@/hooks'
import { Markdown } from '@/component'
import request from '@/utils/request'
import articleDir from '@/article_dir.js'
import { EVENT_EMITTER_NAME, LOCAL_STORAGE_NAME } from '@/utils/constant'
import { DEFAULT_EXPANDED_KEYS } from '@/pages/constant'
import { createFileTree, storage, minDelayTime, get404Md } from '@/utils'

import style from './index.less'
import './index.less' // 如果需要使用 'article-markdown'(不用 style.xxx)，就需要这样导入

const { DirectoryTree } = Tree

function Article() {
    const theme = useTheme()

    const [articleLoading, setArticleLoading] = useState(false)

    const [markdownData, setMarkdownData] = useState('')

    // 如果重复点击一样的目录, 则不再重新加载数据
    const [prevSelectedFilePath, setPrevSelectedFilePath] = useState('')

    const [isOpenDirectoryOnlyArticle, setIsOpenDirectoryOnlyArticle] =
        useState(false)

    const [expandedKeys, setExpandedKeys] = useState(DEFAULT_EXPANDED_KEYS)

    // 点击 .md 文件 =>  D:/code/yomua/public/article/0_base/函数式编程/函数式编程.md
    const [selectedKey, setSelectedKey] = useState('')

    const fileTree = useMemo(() => createFileTree(articleDir), [articleDir])

    const isHaveSkeleton = useMemo(
        () =>
            (storage.getLocalStorage(LOCAL_STORAGE_NAME.ARTICLE_FILE_PATH) &&
                !markdownData) ||
            articleLoading, // 有 path 但没有 markdownData, 说明正在获取数据, 或 loading 为 true
        [markdownData, articleLoading],
    )

    const isShowMarkdown = useMemo(
        () => markdownData && !articleLoading, // 有 markdown 且 loading 为 false
        [markdownData, articleLoading],
    )
    // 点击文件夹或者文件名会触发 onSelect 和 onExpand
    const handleTreeSelect = useCallback(
        async (
            path: string[],
            info: { node: { type: 'file' | 'directory' } },
        ) => {
            // 例如:
            // 若点击文件夹: 0_base/优秀的编程方式
            // 若点击 md 文件: D:/code/yomua/public/article/0_base/函数式编程/函数式编程.md
            const activePath = path?.[0] ?? ''

            if (activePath.includes('.md')) {
                storage.saveLocalStorage({
                    key: LOCAL_STORAGE_NAME.SELECTED_ARTICLE_KEY,
                    value: activePath, // 可以直接改成 article/0_base/函数式编程/函数式编程.md
                })
                setSelectedKey(activePath)
            }

            if (
                !activePath ||
                info?.node?.type !== 'file' ||
                prevSelectedFilePath === activePath
            ) {
                return
            }

            setPrevSelectedFilePath(activePath)

            // 点击时, 把此次点击认做是最后一次点击的文件路径
            // 可以使用 SELECTED_ARTICLE_KEY
            storage.saveLocalStorage({
                key: LOCAL_STORAGE_NAME.ARTICLE_FILE_PATH,
                value: activePath,// 可以直接改成 article/0_base/函数式编程/函数式编程.md
            })

            const importFilePath = (activePath as string)
                ?.split('article')[1]
                ?.replaceAll('//', '/') // 最后得到例如: '/css/缓存.md', fetch 不需要担心 import() 的情况，即: 必须包含一些路径信息。

            // 仅显示文章, 且此时打开了所有文章目录时
            // 当选中某个目录时，将 X（打 X 按钮）切换到 bars, 并切换到文章.
            if (isOpenDirectoryOnlyArticle) {
                EventEmitter.singleInstance.emit(
                    EVENT_EMITTER_NAME.SHOW_HEADER_X,
                    false,
                )

                EventEmitter.singleInstance.emit(
                    EVENT_EMITTER_NAME.OPEN_ARTICLE_DIRECTORY,
                )
            }

            setArticleLoading(true)
            const startTime = Date.now()

            // 通过 fetch 获取根目录下的 article.
            // 不通过 import(): import() 会造成按需加载时，将每一个动态导入的 .md 文件视为一个路由，从而在 build 后多一个拆分的 js 文件
            request(`/article${importFilePath}`).then(async (res) => {
                const endTime = Date.now()

                // 防止因为获取数据太快导致 loading 一闪而快, 所以加一个最小延迟 500 ms.
                await minDelayTime(startTime, endTime)

                const { data, success } = res

                if (!success || !data) {
                    const result = await get404Md()
                    setMarkdownData(result)
                    setArticleLoading(false)
                    return
                }

                // 将 setArticleLoading(false) 放到 setMarkdownData 后面 -> 先设置数据，再取消 loading;
                // 否则, 就会看见数据还未 set， 但是 loading 已经取消了, 最后数据再被设置, 从而造成画面闪烁.
                setMarkdownData(data)
                setArticleLoading(false)
            })
        },
        [prevSelectedFilePath, isOpenDirectoryOnlyArticle],
    )

    const handleTreeExpand = useCallback((expandKeys: string[]) => {
        storage.saveLocalStorage({
            key: LOCAL_STORAGE_NAME.ARTICLE_TREE_EXPANDED_KEYS,
            value: JSON.stringify(expandKeys),
        })

        setExpandedKeys(expandKeys)
    }, [])

    useWindowEventListen('popstate', (event: { state: Location } | any) => {
        const redirectedHrefData = event?.state
        const urlParams = new URLSearchParams(redirectedHrefData?.search)
        const redirected = urlParams?.get('redirected')

        if (redirected !== 'true') {
            return
        }

        let articlePath = redirectedHrefData?.pathname?.replace('/feature/', '')

        const activeFilePath = storage.getLocalStorage(
            LOCAL_STORAGE_NAME.ARTICLE_FILE_PATH,
        )

        const rootArticleIndex = activeFilePath.indexOf('article')

        const rootPath = activeFilePath.slice(0, rootArticleIndex)

        // 防止根路径是用 \ 分割的, 而 articlePath 是用 / 分割的
        if (rootPath.includes('\\')) {
            articlePath = articlePath.replaceAll('/', '\\')
        }

        const resultPath = `${rootPath}${articlePath}`

        setSelectedKey(decodeURIComponent(resultPath))
    })

    // 若是重定向过来的, 则再次重定向到 feature/article, 以便 umi 拦截, 然后使用正确的路由加载组件
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const redirected = urlParams.get('redirected')
        if (redirected === 'true') {
            const redirectedHrefData = new URL(
                storage.getLocalStorage('redirectedHref'),
            )

            const search = redirectedHrefData.search

            redirectedHrefData.search = search
                ? search + '&redirected=true'
                : '?redirected=true'

            // 这时候的路由可以被 umi 拦截
            history.replaceState(
                null,
                document.title,
                `${location.origin}/feature/article${location.hash}`,
            )

            const popStateEvent = new PopStateEvent('popstate', {
                state: redirectedHrefData,
            })
            window.dispatchEvent(popStateEvent)
        }
    }, [])

    // 刷新/切换路由，然后再点进来时，加载最后一次点击的目录的文件数据
    useEffect(() => {
        const filepath = storage.getLocalStorage(
            LOCAL_STORAGE_NAME.ARTICLE_FILE_PATH,
        )

        if (!filepath) {
            get404Md().then((result) => setMarkdownData(result))

            return
        }

        const startTime = Date.now()

        async function initData() {
            setArticleLoading(true)

            // 将 D:/code/yomua/public/article/0_base/xxx.md 改成 /article/0_base/xxx.md
            const requestPath = filepath.slice(filepath.indexOf('/article'))

            request(requestPath).then(async (res) => {
                const endTime = Date.now()

                await minDelayTime(startTime, endTime)

                const { data, success } = res

                if (!success || !data) {
                    const result = await get404Md()
                    setMarkdownData(result)
                    setArticleLoading(false)
                    return
                }

                // 先设置数据再取消 loading
                setMarkdownData(data)
                setArticleLoading(false)
            })
        }

        initData()
    }, [])

    // 从 localStorage, 加载用户自定义展开的所有文章目录结构（若有, 否则使用默认目录 - 初始化已经做了）;
    // 且高亮显示最后一次用户选中的文章（若有）
    useEffect(() => {
        const localExpandedKeys = storage.getLocalStorage(
            LOCAL_STORAGE_NAME.ARTICLE_TREE_EXPANDED_KEYS,
            {
                returnType: 'array',
            },
        )

        const localSelectedArticleKey = storage.getLocalStorage(
            LOCAL_STORAGE_NAME.SELECTED_ARTICLE_KEY,
        )

        localSelectedArticleKey && setSelectedKey(localSelectedArticleKey)

        localExpandedKeys && setExpandedKeys(localExpandedKeys)
    }, [])

    // 监听 Header - 打开菜单按钮点击事件
    useEffect(() => {
        EventEmitter.singleInstance.on(
            EVENT_EMITTER_NAME.OPEN_ARTICLE_DIRECTORY,
            () => {
                setIsOpenDirectoryOnlyArticle(!isOpenDirectoryOnlyArticle)
            },
        )

        return () => {
            EventEmitter.singleInstance.off(
                EVENT_EMITTER_NAME.OPEN_ARTICLE_DIRECTORY,
            )
        }
    }, [isOpenDirectoryOnlyArticle])

    console.log('_selectedKey', selectedKey)

    return (
        <div
            className={classnames(style.article, {
                [style[`article-${theme}`]]: theme,
            })}>
            <div
                className={classnames(style.directoryTreeBox, {
                    [style.showDirectorOnlyArticle]: isOpenDirectoryOnlyArticle,
                })}>
                <DirectoryTree
                    className={style.directoryTree}
                    treeData={fileTree as any[]}
                    expandedKeys={expandedKeys}
                    onExpand={handleTreeExpand as any}
                    selectedKeys={[selectedKey]}
                    onSelect={handleTreeSelect as any}
                />
            </div>

            {isHaveSkeleton && (
                <Skeleton
                    active
                    className={style.skeleton}
                    paragraph={{ rows: 20 }}
                />
            )}

            {isShowMarkdown && (
                <Markdown
                    className={classnames(style.markdown, 'article-markdown', {
                        [style.hideMarkdownOnlyArticle]:
                            isOpenDirectoryOnlyArticle,
                    })}>
                    {markdownData}
                </Markdown>
            )}
        </div>
    )
}

export default memo(Article)
