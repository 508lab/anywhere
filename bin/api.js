const Router = require('router');
const fs = require('fs');
const path = require('path');
const redirect = require('connect-redirection')
const router = Router();
const middleware = require('./middleware');
const jwt = require('jsonwebtoken');
const url = require('url');
const qs = require('querystring');
const multiparty = require('multiparty');
const FileHound = require('filehound');
const conf = require('./conf');

/**
 * api
 */
module.exports = function(argv) {
    router.use(redirect()).use(function(req, res, next) {
        if (!middleware(req, res, next)) {
            return;
        }
        res.setHeader("Access-Control-Allow-Origin", "*");
        let auth = req.headers.authorization;
        if (!req.url.includes('/api/v1') || auth && jwt.verify(auth.split('Bearer ')[1], conf.token.secret)) {

        } else {
            let obj = req.session.login;
            if (!obj && req.url !== '/login' && !req.url.includes('/api/v1')) {
                res.redirect('/login');
                return;
            }
        }

        next();
    })

    /**
     * The login page
     */
    router.get('/login', function(req, res) {
        fs.readFile(path.join(__dirname, '../public', 'login.html'), { encoding: "utf-8" }, function(err, msg) {
            if (!err) {
                res.end(msg);
            }
        });
    })

    /**
     * login api
     */
    router.post('/login', function(req, res) {
        let obj = req.body;
        let result = { status: 200 };
        if (obj && obj.password === conf.password) {
            req.session.login = 1;
            result.data = jwt.sign({}, conf.token.secret, { expiresIn: conf.token.time });
        } else {
            req.session.login = 0;
            result.err = 'password is err';
        }
        res.end(JSON.stringify(result));
    })

    /**
     * Gets files and folders in the directory
     */
    router.get('/api/v1/path', function(req, res) {
        let arg = url.parse(req.url).query;
        let path = qs.parse(arg)['q'] || '';
        try {
            let arr = fs.readdirSync(argv.dir + path, { withFileTypes: true });
            let dirs = arr.filter((ele) => { return ele.isDirectory() });
            let files = arr.filter((ele) => { return !ele.isDirectory() });
            res.end(JSON.stringify({
                status: 200,
                data: {
                    d: dirs,
                    f: files
                }
            }));
        } catch (error) {
            res.end(JSON.stringify({
                status: 200,
                data: 'no such file or directory',
            }));
        }
    })

    /**
     * upload files
     */
    router.post('/api/v1/path', function(req, res) {
        let arg = url.parse(req.url).query;
        let path = qs.parse(arg)['q'] || '';
        let form = new multiparty.Form();
        form.encoding = 'utf-8';
        let uploadPath = argv.dir + path;
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        form.uploadDir = uploadPath;
        // form.maxFilesSize = 2 * 1024 * 1024;
        // form.maxFields = 1000;  
        form.parse(req, function(err, fields, files) {
            for (const key in files) {
                if (files.hasOwnProperty(key)) {
                    const file = files[key][0];
                    fs.renameSync(file.path, uploadPath + '/' + file.originalFilename);
                }
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                status: 200,
                data: 'ok'
            }));
        });
    })


    /**
     * search api
     */
    router.get('/api/v1/search', function(req, res) {
        let arg = url.parse(req.url).query;
        let path = qs.parse(arg)['path'] || '';
        let q = qs.parse(arg)['q'] || '';

        let files = FileHound.create()
            .paths(argv.dir + path)
            .match(`*${q}*`)
            .findSync();

        let dirs = FileHound.create()
            .paths(argv.dir + path)
            .directory()
            .match(`*${q}*`)
            .findSync();
        files = files.map((e) => { return e.slice((argv.dir + path).length, e.length); });
        dirs = dirs.map((e) => { return e.slice((argv.dir + path).length, e.length); });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
            status: 200,
            data: {
                d: dirs,
                f: files
            }
        }));
    })

    return router;
};