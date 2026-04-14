$(function () {
    var util = {
        // 获取 localStorage
        getItem: function (item) {
            var value;
            if (this.hasLocalSotrage()) {
                try {
                    value = localStorage.getItem(item);
                } catch (error) {
                    console.error('localStorage.getItem报错， ', error.message);
                } finally {
                    return value;
                }
            } else {
                return this.getCookie(item);
            }
        },
        // 设置 localStorage
        setItem: function (key, value, day) {
            if (this.hasLocalSotrage()) {
                try {
                    localStorage.setItem(key, value);
                } catch (error) {
                    console.error('localStorage.setItem报错， ', error.message);
                }
            } else {
                this.setCookie(key, value, day);
            }
        },
        // 判断浏览器是否支持 hasLocalSotrage
        hasLocalSotrage: function () {
            return window.Storage && window.localStorage && window.localStorage instanceof Storage
        },
        //设置cookie
        setCookie: function (key, value, day) {
            var t = day || 30;
            var d = new Date();
            d.setTime(d.getTime() + (t * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = key + "=" + value + "; " + expires;
        },
        //获取cookie
        getCookie: function (name) {
            var arr, reg = new RegExp("(^|)" + name + "=([^]*)(|$)");
            if (arr = document.cookie.match(reg)) {
                return arr[2];
            } else {
                return null;
            }
        },
        getTime: function () {
            return Math.round(new Date().getTime() / 1000);
        }
    }
    var online = function () {
        var lastTime = parseInt(util.getItem('online_time') || 0);
        var nowTime = util.getTime();
        if (nowTime < lastTime + 120) {
            return;
        }
        util.setItem('online_time', nowTime);
        $.post('/user/online', function (ret) {
            if (ret.status == false && ret.offline) {
                Yee.alert('您已被强制下线，请重新登录', function () {
                    window.location.href = '/user/login';
                });
            }
        }, 'json');
    }
    setInterval(function () {
        online();
    }, 10000);
    setTimeout(function () {
        online();
    }, 1000);

});