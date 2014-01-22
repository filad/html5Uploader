/*
 * HTML5Uploader
 * https://github.com/filad/html5Uploader
 *
 * Copyright 2014, Adam Filkor
 * http://filkor.org
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint nomen: true, regexp: true */
/*global define, window, URL, webkitURL, FileReader */


(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery',
            'tmpl',
            './jquery.fileupload-resize',
            './jquery.fileupload-validate'
        ], factory);
    } else {
        // Browser globals:
        factory(
            window.jQuery,
            window.Handlebars
        );
    }
}(function ($, Handlebars) {
    'use strict';

    $.blueimp.fileupload.prototype._specialOptions.push(
        'filesContainer',
        'uploadTemplateId',
        'downloadTemplateId'
    );

    // The UI version extends the file upload widget
    // and adds complete user interface interaction:
    $.widget('filkor.html5Uploader', $.blueimp.fileupload, {

        options: {
            // By default, files added to the widget are uploaded as soon
            // as the user clicks on the start buttons. To enable automatic
            // uploads, set the following option to true:
            autoUpload: false,
            //chunking uploads by default
            maxChunkSize: 1024*512, // 0.5MB
            // The ID of the upload template:
            uploadTemplateId: 'template-upload',
            // The ID of the download template:
            downloadTemplateId: 'template-download',
            // The container for the list of files. If undefined, it is set to
            // an element with class "files" inside of the widget element:
            filesContainer: '#files',
            // The expected data type of the upload response, sets the dataType
            // option of the $.ajax upload requests:
            dataType: 'json',

            // Function returning the current number of files,
            // used by the maxNumberOfFiles validation:
            getNumberOfFiles: function () {
                return this.filesContainer.children().length;
            },

            // The add callback is invoked as soon as files are added to the fileupload
            // widget (via file input selection, drag & drop or add API call).
            add: function (e, data) {

                var $this = $(this),
                    that = $this.data('filkor-html5Uploader'),
                    options = that.options,
                    files = data.files,
                    addmore = $("#add-more-button"),
                    existingFiles = options.existingFiles || [];
                
                data.process(function () {
                    return $this.html5Uploader('process', data);
                }).always(function () {
                    $("#info-wrapper").fadeIn('fast'); 
                    addmore.removeClass('hidden');

                    //data.context is represents a single li.file-item (if fact, it's attached as an object to it's 'data' attribute)
                    data.context = that._renderUpload(files).data('data', data);
                    options.filesContainer[ options.prependFiles ? 'prepend' : 'append' ](data.context);


                    that._forceReflow(data.context);
                    that._transition(data.context).done(
                        function () {
                            if ((that._trigger('added', e, data) !== false) &&
                                    (options.autoUpload || data.autoUpload) &&
                                    data.autoUpload !== false && !data.files.error) {
                                data.submit();
                            }
                        }
                    );
                });
            },

            // Callback for the start of each file upload request:
            send: function (e, data) {
                var that = $(this).data('filkor-html5Uploader');
                data.context.find('.resumed-upload-note').fadeOut(); 

                if (data.context && data.dataType &&
                        data.dataType.substr(0, 6) === 'iframe') {
                    // Iframe Transport does not support progress events.
                    // In lack of an indeterminate progress bar, we 
                    // showing the full animated bar:
                    // Bit hacky.
                   if (!$.support.transition) {
                        data.context
                            .find('.progress').hide()
                            .find('.bar')
                            .css('width','100%');

                        data.context
                            .find('.progress-wrap')
                            .append('<img src="/assets/img/progress-static.gif" class="progress-static">')
                            .css('height','7px');
                   }
                }
                return that._trigger('sent', e, data);
            },

            // Callback for successful uploads:
            done: function (e, data) {
                var that = $(this).data('filkor-html5Uploader'),
                getFilesFromResponse = data.getFilesFromResponse ||
                    that.options.getFilesFromResponse,
                files = getFilesFromResponse(data),
                progressbar = data.context.find('.progress .bar'),
                file = files[0] || {error: 'Empty file upload result'};
                
                
                //could have used _transition, but its buggy for some reason..
                data.context
                    .find('.cancel-single').hide();

                data.context
                    .find('.success-tick').fadeIn('fast');

                data.context
                    .find('.download-link').attr('href', file.url).show();

                if (!$.support.transition) {
                    //hide the 'static' progress animation
                    data.context
                        .find('.progress-static').hide();
                    data.context
                        .find('.progress').show();
                }
            },

            fail: function (e, data) {
                data.context.each(function (index) {
                var file = data.files[index];
                file.error = file.error || data.errorThrown ||
                    true;
                console.log(file.error);
            });
            },

            // Callback for upload progress events:
            progress: function (e, data) {
                if (data.context) {
                    var progress = Math.floor(data.loaded / data.total * 100);
                    data.context.find('.progress')
                        .attr('aria-valuenow', progress)
                        .find('.bar').css(
                            'width',
                            progress + '%'
                        );
                }
            },

            // Callback for global upload progress events:
            progressall: function (e, data) {
                var $this = $(this),
                    timeInfo = $this.find('.time-info'),
                    bitrateInfo = $this.find('.speed-info');

                timeInfo.find('span').html(
                    $this.data('filkor-html5Uploader')._renderTimeInfo(data)
                );

                bitrateInfo.html(
                    $this.data('filkor-html5Uploader')._renderBitrateInfo(data)
                );
            },

            processstart: function () {
                //console.log('processstart..');
            },

            destroy: function (e, data) {
                //destroy file.
                //By default when you click on the cancel btn you only abort the jqXHR, it doesn't deletes the file 
                //(If you want to deletion  you can implement it here)
            },

            // Callback to retrieve the list of files from the server response:
            getFilesFromResponse: function (data) {
                if (data.result && $.isArray(data.result.files)) {
                    return data.result.files;
                }
                return [];
            }
        },

        _renderTemplate: function (func, files) {
      if (!func) {
                return $();
            }
            var result = func({
                files: files,
                options: this.options
            });
            if (result instanceof $) {
                return result;
            }

            return $(this.options.templatesContainer).html(result).children();
        },

        _renderUpload: function(files) {
            return this._renderTemplate(
                this.options.uploadTemplate,
                files
            );
        },

        // http://stackoverflow.com/questions/9016307/force-reflow-in-css-transitions-in-bootstrap
        _forceReflow: function (node) {
            return $.support.transition && node.length &&
                node[0].offsetWidth;
        },

        _transition: function (node) {
            var dfd = $.Deferred();
            if ($.support.transition) {
                node.on(
                    $.support.transition.end,
                    function (e) {
                        // Make sure we don't respond to other transitions events
                        // in the container element, e.g. from button elements:
                        if (e.target === node[0]) {
                            node.unbind($.support.transition.end);
                            dfd.resolveWith(node);
                        }
                    }
                );
            } else {
                dfd.resolveWith(node);
            }
            return dfd;
        },

        _formatBitrate: function (bits) {
            if (typeof bits !== 'number') {
                return '';
            }
            if (bits >= 8589934592) {
                return (bits / 1073741824 / 8).toFixed(2) + ' GB/s';
            }
            //1MB would be 8388608
            if (bits >= 12388608) {
                return (bits / 1048576 / 8).toFixed(1) + ' MB/s';
            }
            if (bits >= 8192) {
                return (bits / 1024 / 8).toFixed(0) + ' KB/s';
            }
            if (bits < 0) return 0;

            return (bits / 8).toFixed(2) + ' byte/s';
        },

        _formatTime: function (seconds) {
            if (seconds < 0) seconds = 0;

            var date = new Date(seconds * 1000),
                days = Math.floor(seconds / 86400);
            days = days ? days + 'd ' : '';
            return days +
                ('0' + date.getUTCHours()).slice(-2) + ':' +
                ('0' + date.getUTCMinutes()).slice(-2) + ':' +
                ('0' + date.getUTCSeconds()).slice(-2);
        },

        _renderTimeInfo: function (data) {
            return this._formatTime(
                (data.total - data.loaded) * 8 / data.bitrate
            );
        },

        _renderBitrateInfo: function (data) {
            return this._formatBitrate(data.bitrate);
        },

        _initTemplates: function () {
            var options = this.options;
            options.templatesContainer = this.document[0].createElement(
                options.filesContainer.prop('nodeName')
            );

            if (Handlebars) {
                if (options.uploadTemplateId) {
                    var source = $('#' + options.uploadTemplateId).html();
                    options.uploadTemplate = Handlebars.compile(source);
                }
            }
        },

        _initFilesContainer: function () {
            var options = this.options;
            if (options.filesContainer === undefined) {
                options.filesContainer = this.element.find('.files');
            } else if (!(options.filesContainer instanceof $)) {
                options.filesContainer = $(options.filesContainer);
            }
        },

        _initHandlebarHelpers: function () {
            //debug, usage {{debug}} or {{debug someValue}}
            Handlebars.registerHelper("debug", function (optionalValue) {
                    console.log("Current Context");
              console.log("====================");
              console.log(this);
             
              if (optionalValue) {
                console.log("Value");
                console.log("====================");
                console.log(optionalValue);
              }
            });

            //format File size,
            Handlebars.registerHelper("formatFileSize", function (bytes) {
                if (typeof bytes !== 'number') {
                    return '';
                }
                if (bytes >= 1073741824) {
                    return (bytes / 1073741824).toFixed(1) + ' GB';
                }
                if (bytes >= 1048576) {
                    return (bytes / 1048576).toFixed(1) + ' MB';
                }
                return (bytes / 1024).toFixed(0) + ' KB';
            });

            Handlebars.registerHelper("shortenName", function (name) {
                if (name.length > 45) {
                    name = ' ' + name.substring(0, 45) + '...';
                }
                return name;
            });

        },

        _startHandler: function (e) {
            var data;
            e.preventDefault();
            $(".file-item").each(function(index, fileItem) {
                data = $(fileItem).data('data');
                if (data && data.submit && !data.jqXHR && !data.files.error && data.submit()) {
                    //show pause btn for exmaple
                }
            });
        },

        _cancelHandler: function (e) {
            var template = $(e.currentTarget).closest('.file-item'),
                data = template.data('data') || {},
                that = this;
                
            template.slideUp('fast', function () {
                if (data.jqXHR) {
                    data.jqXHR.abort();
                    
                    //we may also delete the file, even when it's partially uploaded
                    //that._trigger('destroy', e, data);
                }
                template.remove();
            });


        },

        _initEventHandlers: function () {
            var uploadBtn = $("#start-button");
            this._super();

            this._on(uploadBtn, {'click' : this._startHandler});

            this._on(this.options.filesContainer, {
                'click .cancel-single': this._cancelHandler
            });
        },

        _initSpecialOptions: function () {
            this._super();
            this._initFilesContainer();
            this._initTemplates();
        },

        _create: function () {
            this._super();
            this._initHandlebarHelpers();
        }

    });
}));
