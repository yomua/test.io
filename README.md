# 概述
Yomua

# 版本
```json
{
  "private": true,
  "scripts": {
    "start": "umi dev",
    "build": "umi build",
    "postinstall": "umi generate tmp",
    "prettier": "prettier --write '**/*.{js,jsx,tsx,ts,less,md,json}'",
    "test": "umi-test",
    "test:coverage": "umi-test --coverage"
  },
  "gitHooks": {
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,less,md,json}": [
      "prettier --write"
    ],
    "*.ts?(x)": [
      "prettier --parser=typescript --write"
    ]
  },
  "dependencies": {
    "@ant-design/pro-layout": "^6.5.0",
    "react": "17.x",
    "react-dom": "17.x",
    "umi": "^3.5.13"
  },
  "devDependencies": {
    "@types/react": "^17.0.0",
    "@types/react-dom": "^17.0.0",
    "@umijs/plugin-sass": "^1.1.1",
    "@umijs/preset-react": "1.x",
    "@umijs/test": "^3.5.13",
    "lint-staged": "^10.0.7",
    "node-sass": "4.14.0",
    "prettier": "^2.2.0",
    "sass-loader": "^12.1.0",
    "typescript": "^4.1.2",
    "yorkie": "^2.0.0"
  }
}
```

# md -> html

可以将 .md（文章）内容直接复制并存储到一个个 txt 中，然后获取 txt 的内容并存储到数组中，然后再渲染这个数组前，使用 [markdown](https://github.com/millerblack/markdown-js).js 库将内容编译成 html，最后再渲染到页面。

这样就成功把 .md 搞到了页面上。



# 要用什么

里面文章内容布局：左边目录，右边正文。可以使用 [antd - menu](https://ant.design/components/menu-cn/)

















