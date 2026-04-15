Yee.config({
    version: (function () {
        return '1.0.8';
        //return new Date().getTime();
    }()),
    //预加载,提前加载的
    preloading: {
        'layer': (function () {
            if (window.layer) {
                return null;
            }
            if (Yee.isMobile) {
                return 'layer/mobile/layer.js';
            }
            //载入layer-css ie11 不自动载入css
            var heads = document.getElementsByTagName('head');
            if (heads.length > 0) {
                var head = heads[0];
                var link = document.createElement('link');
                link.href = '/yeeui/layer/theme/default/layer.css';
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('id', 'layuicss-layer');
                link.setAttribute('type', 'text/css');
                head.appendChild(link);
            }
            return 'layer/layer.js';
        })(),
        'promise': (function () {
            if (window.Promise) {
                return null;
            }
            return 'third/promise.js';
        })(),
    },
    //模块,可以用 use 引入
    modules: {
        //定义模块路径
        'json': window.JSON ? '' : 'third/json3.min.js',
        'jquery-cookie': 'third/jquery.cookie.js',
        'jquery-mousewheel': 'third/jquery.mousewheel.min.js',
        'base64': window.atob ? '' : 'base64.min.js',
        'xheditor': 'xheditor/xheditor-1.2.2.min.js',
        'xheditor-lang': 'xheditor/xheditor_lang/zh-cn.js',
        'tinymce': 'tinymce/tinymce.min.js',
        'tinymce-jquery': 'tinymce/jquery.tinymce.min.js',
        'tinymce-lang': 'tinymce/langs/zh_CN.js',
        'vue': window.Vue ? '' : 'third/vue.min.js',
    },
    //依赖,加载包的时候自动引入
    depends: {},
    dataFormat: null
});