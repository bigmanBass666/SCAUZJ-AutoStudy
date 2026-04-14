$(function () {

    var videoFile = $('#video-file').val() || '';
    var nodeId = $('#video-nodeId').val() || '';
    var userId = $('#user-id').val() || '0';
    var schoolId = $('#school-id').val() || '0';
    var studyState = $('#study-state').val() || 0;


    var appId = $('#appId').val() || '';
    var nonce = $('#nonce').val() || '';
    var timestamp = $('#timestamp').val() || '';
    var sign = $('#sign').val() || '';

    $.ajax({
        url: '/service/sign',
        headers: {
            'Authorization': sign,
        },
        type: "POST",
        dataType: 'json',
        timeout: 3000,
        data: {
            appId: appId,
            nonce: nonce,
            timestamp: timestamp,
            nodeId: nodeId,
            userId: userId,
            studyId: studyId,
            studyTime: studyTime
        },
        success: function (rest) {
            console.log("rest", rest);


        }
    });


    studyState = parseInt(studyState);
    // console.log(studyState);

    var storage = {
        set: function (name, value) {
            if (window.localStorage) {
                window.localStorage.setItem(name, value);
                return;
            }
            var Days = 30;
            var exp = new Date();
            exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);
            document.cookie = name + '=' + escape(value) + ';expires=' + exp.toGMTString();
        }, get: function (name) {
            if (window.localStorage) {
                return window.localStorage.getItem(name);
            }
            var arr, reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)');
            if (arr = document.cookie.match(reg)) {
                return unescape(arr[2]);
            } else {
                return null;
            }
        }, del: function (name) {
            if (window.localStorage) {
                return window.localStorage.removeItem(name);
            }
            var exp = new Date();
            exp.setTime(exp.getTime() - 1);
            var cval = this.get(name);
            if (cval != null) {
                document.cookie = name + '=' + cval + ';expires=' + exp.toGMTString();
            }
        }
    };

    var studyUrl = '/user/node/study';
    var studyId = 0;
    var totalTime = 0;
    var studyTime = 0;
    var player = null;
    var playState = 'stop';
    var playId = 'node_' + schoolId + userId + '_' + nodeId;
    var layId = 0;

    window.setInterval(function () {
        storage.set('node_play_' + schoolId + userId, nodeId);
    }, 567);
    console.log('同学，我们已经发现您具有相应的网络知识，了解浏览器的调试模式，这挺好的，以下是要对您说的一些警告信息。');
    console.log('警告：请不要以任何取巧方式进行作弊刷课或帮助其他人刷课，系统已对所有课时的真实性进行统计计算评估，收集数据包括不限于（浏览器头，版本，播放器记录，登录时长，cookie,referer,ip追踪,终端平台，是否符是您的账号，登录过多少个账号，历史登录记录.. 等各种操作数据及ajax随机埋点），一经发现作弊轻则取消学时，重则取消成绩。');

    window.setInterval(function () {
        var bNodeId = storage.get('node_play_' + schoolId + userId);
        if (bNodeId != nodeId && layId == 0) {
            layId = Yee.alert('检测到有其他视频页面同时打开，这会对学时记录真实性产生误判，请先关闭其他章节的视频播放页面！', function () {
                Yee.close(layId);
                layId = 0;
            });
            if (player != null) {
                playState = 'pause';
                player.videoPause();
            }
            return;
        }
        if (playState == 'playing') {
            totalTime++;
            console.log("totalTime:" + totalTime);
        }
    }, 1000);

    //记录鼠标行为轨迹,用于分析作弊,已完成的不在记录
    var loged = (studyState == 2);
    var xlogs = [];
    var sentLog = function () {
        if (loged) {
            return;
        }
        loged = true;
        //$.post('/service/mouse_log', {g: JSON.stringify(xlogs), nodeId: nodeId});
    };
    document.body.addEventListener('mousemove', function (e) {
        if (loged) {
            return;
        }
        var ofs = $('#videoContent').offset();
        if (xlogs.length > 1500) {
            xlogs.shift();
            xlogs.shift();
            xlogs.shift();
        }
        var x = Math.round(e.clientX - ofs.left);
        var y = Math.round(e.clientY - ofs.top);
        var t = new Date().getTime() % 20000;
        xlogs.push(x);
        xlogs.push(y);
        xlogs.push(t);
    });
    //处理验证码,防止使用外挂
    var layIndex = null;
    var tw = '';
    var temp = $('<div style="padding: 20px;display: none; text-align: center"></div>');
    var tip = $('<div style="height:50px;line-height:50px;">为了确认是您本人在操作，需要输入验证码。</div>').appendTo(temp);
    var boxArea = $('<div style="height:50px;line-height:50px"></div>').appendTo(temp);
    var yzmBox1 = $('<input id="yzCode" type="text" style="display: none;vertical-align: middle;height: 40px;width: 90px; padding: 5px; border: 1px #ccc solid; border-radius: 5px;" placeholder="请输入验证码">').appendTo(boxArea);
    var yzmBox = $('<input type="text" style=" vertical-align: middle;height: 40px;width: 90px; padding: 5px; border: 1px #ccc solid; border-radius: 5px;" placeholder="请输入验证码">').appendTo(boxArea);
    var imgCode1 = $('<img style=" vertical-align: middle;margin-left: 5px;opacity:0;border-radius: 5px;" id="codeImg" align="center" height="40" src="/service/code?r=' + Math.random() + '" alt="看不清楚点击刷新！"/>').appendTo(boxArea);
    var imgCode = $('<img style=" vertical-align: middle; margin-left:-85px;border-radius: 5px;" align="center" height="40" src="/service/code?r=' + Math.random() + '" alt="看不清楚点击刷新！"/>').appendTo(boxArea);
    imgCode1.on('click', function () {
        imgCode1.attr('src', '/service/code?r=' + Math.random());
        imgCode.attr('src', '/service/code/aa?r=' + Math.random());
    });
    imgCode.on('click', function () {
        imgCode1.attr('src', '/service/code?r=' + Math.random());
        imgCode.attr('src', '/service/code/aa?r=' + Math.random());
    });
    temp.appendTo(document.body);
    var sendCode = function () {
        if (!layIndex) {
            return;
        }
        if ((yzmBox1.val() || '') == '') {
            var yzCode = yzmBox.val();
            if (yzCode == '') {
                layer.alert('请输入验证码');
                return;
            }
            yzmBox.val('');
        } else {
            yzCode = yzmBox1.val();
            tw = '';
        }
        layer.close(layIndex);
        layIndex = null;
        sendTime(1, yzCode);
    }
    yzmBox.on('keypress', function (e) {
        if (layIndex && e.which == 13) {
            sendCode();
        }
    });
    yzmBox.on('mousedown', function (e) {
        tw = '_';
    });

    var sendTime = function (force, code) {
        studyTime = totalTime;
        var data = {nodeId: nodeId, studyId: studyId, studyTime: totalTime};
        if (code) {
            if (code.length > 4) {
                code = code.substr(0, 4);
            }
            data.code = code + tw;
        }
        if (force !== void 0 && force == 1 && totalTime < 1) {
            data.studyTime = 1;
        }


        var xhr = $.ajax({
            type: "POST", url: studyUrl, timeout: 3000, data: data, dataType: 'json', success: function (ret) {//返回数据根据结果进行相应的处理
                if (ret.status) {

                    var retState = ret.state;

                    if (retState == 1) {

                        studyId = 0;
                        layer.tips("您的网络课程出现问题了,请注意检查！");
                        /*
                         playState = 'pause';
                         player.videoPause();
                         layer.alert("提交学习时长失败!<br/>请加群：331200845或刷新浏览器！<br/>" + ret.msg, {
                             btn: ['刷新页面'],
                             yes: function () {
                                 window.location.reload();
                             }
                         });
                         */

                    } else {

                        studyId = ret.studyId;

                        if (code) {
                            playState = 'playing';
                            player.videoPlay();
                        }

                    }


                } else {

                    if (ret.need_code == 2) {

                        playState = 'pause';
                        player.videoPause();
                        if ($('#video-captcha').html() == '') {
                            var temp1 = $('<form class="bform" method="post"></form>');
                            layIndex = $('#video-captcha').html(temp1);
                            $('.bform').captcha({
                                clicks: 3,
                                ak: '38570387e765646dff8372d4ec9e3c38',
                                url: 'https://shixun.kaikangxinxi.com/api/dunclick.json',
                                tip: '请依次点击图中的',
                                verify: ret.verifyToken,
                                callback: function (ret) {
                                    playState = 'playing';
                                    player.videoPlay();
                                },
                            });
                            $('input[name="captcha"]').trigger("event");
                        }


                    } else if (ret.need_code == 1) {
                        imgCode1.attr('src', '/service/code?r=' + Math.random());
                        imgCode.attr('src', '/service/code/aa?r=' + Math.random());
                        playState = 'pause';
                        player.videoPause();
                        if (layIndex === null) {
                            layIndex = layer.open({
                                end: function () {
                                    layIndex = null;
                                }, closeBtn: 0, type: 1, shade: false, area: ['420px', '240px'], //宽高
                                content: temp, btn: ['开始播放', '取消'], btn1: function () {
                                    sendCode();
                                }
                            });
                        }
                    }
                }

            }, error: function (textStatus) {
                console.log(textStatus);
                if (textStatus.status < 200 || textStatus.status > 302) {
                    playState = 'pause';
                    player.videoPause();
                    layer.tips("您的网络课程出现问题了,请注意检查！");
                    // layer.ti('提交学习时长失败,请加群：331200845或刷新浏览器！');
                }
            }, complete: function (XMLHttpRequest, status) {
                console.log(status);
                if (status != 'success') {
                    xhr.abort();    // 超时后中断请求
                }
            }
        });


    };
    window.addEventListener('unload', function (ev) {
        var form = new FormData();
        var data = {nodeId: nodeId, studyId: studyId, studyTime: totalTime, close: 1};
        for (var k in data) {
            form.append(k, data[k]);
        }
        window.navigator.sendBeacon(studyUrl, form);
    });

    var interval = 10000;
    if (typeof (window.navigator.sendBeacon) == 'function') {
        interval = 30000;
    }
    //提交学习时间---
    window.setInterval(function () {
        if (player == null || totalTime <= studyTime) {
            return;
        }
        sendTime();
    }, interval);
    window.loadHandler = function () {
        player.addListener('play', function () {
            //   player.changeControlBarShow(true);
            playState = 'playing';
            if (studyId == 0) {
                sendTime(1);
            }
            sentLog();
        });
        player.addListener('pause', function () {
            // player.changeControlBarShow(false);
            playState = 'pause';
            sendTime();
        });
        player.addListener('ended', function () {
            // player.changeControlBarShow(false);
            playState = 'ended';
            storage.del(playId);
            sendTime();
            player.changeConfig('config', 'timeScheduleAdjust', 1);
        });
        player.addListener('time', function (t) {
            storage.set(playId, t);
        }); //监听播放时间


        /*  player.addListener('seekTime', function (t) {

              var cookieTime = storage.get(playId);
              if (!cookieTime || cookieTime == undefined) {
                  cookieTime = 0;
              }

              if (cookieTime < 0) {
                  return;
              }

              if (t > cookieTime) {
                  player.videoSeek(t - 1);
              } else {
                  player.videoSeek(cookieTime);
              }


          });*/


        // player.changeControlBarShow(false);
        if (studyState < 2) {
            player.changeConfig('config', 'timeScheduleAdjust', 5);
        }

    };
    var option = {
        container: '#videoContent', //容器的ID或className
        variable: 'player', //播放函数名称
        drag: 'start', //拖动的属性
        loaded: 'loadHandler', html5m3u8: true, flashplayer: false, //强制使用flashplayer
        video: [[videoFile, 'video/mp4', '中文标清', 0]]
    };
    var cookieTime = storage.get(playId);
    if (!cookieTime || cookieTime == undefined) {
        cookieTime = 0;
    }
    if (cookieTime > 0) {
        option['seek'] = cookieTime;
    }
    player = new ckplayer(option);
});
