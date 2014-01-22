$(function () {
    'use strict';

    //set up our file upload script
    $("#fileupload").html5Uploader({
        url: 'server/php/',
        maxFileSize: 1024*1024*20 // 20MB
    });

    // Load informations about the already uploaded files (We don't use this, but maybe you will need. Check the console.)
    $.ajax({
        url: $('#fileupload').html5Uploader('option', 'url'),
        dataType: 'json',
        context: $('#fileupload')[0]
    }).always(function () {

    }).done(function (result) {
        //do with the result what you want here
        //this will return the already uploaded files (even if they are only partially uploaded)
        console.log(result.files);
    });


    $("#tryitbutton").click(function () {
        $('html, body').animate({
            scrollTop: $("#fileupload").offset().top - 100
        }, 500);
    });
});