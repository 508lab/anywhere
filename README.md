Anywhere 随启随用的静态文件服务器
==============================

Running static file server Anywhere. 随时随地将你的当前目录变成一个静态文件服务器的根目录。

## 修改说明
- 添加目录加密访问
- 修改默认样式
- 默认关闭https

## Installation

```sh
git clone https://github.com/508laboratory/anywhere.git
```

## Execution

```sh
$ node ./bin/anywhere.js
// or with port
$ node ./bin/anywhere.js -p 8000
// or start it but silent(don't open browser)
$ node ./bin/anywhere.js -s
// or with hostname
$ node ./bin/anywhere.js -h localhost -p 8888
// or with folder
$ node ./bin/anywhere.js -d ~/git/aaa
// or enable html5 history
$ node ./bin/anywhere.js -f /index.html
```

## Help

```sh
$ node ./bin/anywhere.js --help
Usage:
  node ./bin/anywhere.js --help // print help information
  node ./bin/anywhere.js // 8000 as default port, current folder as root
  node ./bin/anywhere.js 8888
  node ./bin/anywhere.js -p 8989
  node ./bin/anywhere.js -s // don't open browser
  node ./bin/anywhere.js -h localhost // localhost as hostname
  node ./bin/anywhere.js -d /home // /home as root
  node ./bin/anywhere.js -f /index.html  // Enable html5 history,the index is /index.html
  node ./bin/anywhere.js --proxy http://localhost:7000/api // Support shorthand URL, webpack.config.js or customize config file
```

#### Proxy argvs

**Shorthand URL**
```
node ./bin/anywhere.js --proxy http://localhost:7000/api
                 \___________________/\___/
                              |         |
                           target    context
```
More about the [shorthand configuration](https://github.com/chimurai/http-proxy-middleware#shorthand).

**Webpack conofig**
```javascript
// webpack.conofig.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true
      }
    }
  }
}
```

**Customize config**
```javascript
// proxy.config.js
module.exports = {
  '/api': {
    target: 'http://localhost:7000',
    changeOrigin: true
  }
}
```
More proxy [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware#context-matching) help.

## Visit

```
http://localhost:8000
```
Automatically open default browser. 执行命令后，默认浏览器将为您自动打开主页。

## License
The MIT license.
