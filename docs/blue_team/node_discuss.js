$(function () {

    window.showReFrom = function (elem) {
        var item = $(elem).parents('.item:first');
        $('#discuss').find('.replay-form').hide();
        item.find('.mian-repform').show();
    }

    window.showRe2From = function (elem) {
        var item = $(elem).parents('.repitem:first');
        $('#discuss').find('.replay-form').hide();
        item.find('.item-repform').show();
    }

    window.hideReFrom = function (elem) {
        var item = $(elem).parents('.item:first');
        item.find('.replay-form').hide();
    }

    window.resetFrom = function (elem) {
        $(elem).get(0).reset();
        var item = $(elem).parents('.item:first');
        item.find('.replay-form').hide();
        $('#discuss').emit('reload');
    }

    window.reload = function () {
        $('#discuss').emit('reload');
    }

    $('#discuss-form').on('success', function () {
        $('#discuss-form').get(0).reset();
        $('#input-images').empty();
        $('#input-files').empty();
        $('#images-layout').empty();
        $('#files-layout').empty();
        $('#images-input').val('');
        $('#files-input').val('');
        $('#discuss').emit('reload');
    });

    $('#discuss').on('render', function (ev, data) {
        window.updateUpload();
    });

});