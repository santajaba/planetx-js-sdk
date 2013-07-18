/**
 * This is SKPLNAETX JavaScript SDK
 * Author: Kwak Nohyun (nhkwak@sk.com) , Junghyun Han (junghyun.han@sk.com)
 * Copyright (c) SK planet
 */

(
/**
 * @class
 * @name planetxsdk
 * @namespace skp.openplatformconnector.planetxsdk
 * @description planet X JavaScript SDK
 * @version 1.0
 * @author Kwak Nohyun (nhkwak@sk.com) , Junghyun Han (junghyun.han@sk.com)
 */
function ( $, window, undefined ) {
    var doc = document;
    var PlanetX = function( ) {
        // you can configure these variables using PlanetX.init() function
        this.isIE = (/MSIE/i).test( navigator.userAgent );
        this.appkey = "" ;
        // <form> tag id for OAuth 2.0 request
        this.login_form = null ;
        this.client_id = "";
        this.response_type = "token";
        this.scope = "";
        this.redirect_uri = "";
        // access token
        this._access_token = "";
        this._access_token_start = 14;
        this._access_token_end = 50;
        this._access_token_time = null ;
        this._access_token_time_limit = 43195;
        // login status
        this._loginStatus = false;
        // check whether this web app (or web page) already has access token or not.
        this._checkAccessToken();
    };
    // prototype
    PlanetX.prototype = {
        // System information
        versionNumber: '1.0.0',
        // Return code
        SUCCESS_INIT: 100,
        SUCCESS_LOGIN: 101,
        SUCCESS_LOGOUT: 102,
        SUCCESS_API: 200,
        ERROR_INIT: -100 ,
        ERROR_LOGIN: -101 ,
        ERROR_LOGOUT: -102 ,
        ERROR_PARAMETER_MISSING: -201 ,
        /**
         * @function init
         */
        init: function ( obj ) {
            // first call
            var i,
                that = this,
                typeAttr,
                nameAttr,
                valueAttr,
                body = doc.getElementsByTagName( "body" )[0];
            if ( this.login_form === null ){
                // initializing with object parameter
                if ( !! obj ) {
                    for ( i in obj ) {
                        this[i] = obj[i];
                    }
                }
                // making new <form> tag
                this.login_form = doc.createElement( "form" );
                this.login_form.action = "https://oneid.skplanetx.com/oauth/authorize";
                this.login_form.method = "get";
                // making <input> tags and their attributes in <form> tag
                jQuery.each( [ "client_id", "response_type", "scope", "redirect_uri" ], function(i, name){
                    node = doc.createElement( "input" );
                    // making new attributes
                    typeAttr = doc.createAttribute( "type" );
                    nameAttr = doc.createAttribute( "name" );
                    valueAttr = doc.createAttribute( "value" );
                    // setting attribute values
                    typeAttr.value = "hidden";
                    nameAttr.value = name;
                    valueAttr.value = that[ name ];
                    // attaching attributes to <input> tag
                    node.setAttributeNode( typeAttr );
                    node.setAttributeNode( nameAttr );
                    node.setAttributeNode( valueAttr );
                    // attaching <input> tag to <form> tag
                    that.login_form.appendChild( node );
                });
                body.appendChild( this.login_form );
                return this.SUCCESS_INIT;
            } else { // can't call twice
                return this.ERROR_INIT;
            }
        },
        /**
         * @function login
         */
        login: function ( ) {
            // if existing <form> tag for log-in
            if ( this.login_form !== null ) {
                this.login_form.submit( );
                return this.SUCCESS_LOGIN;
            } else {
                return this.ERROR_LOGIN;
            }
        },
        /**
         * @function logout
         */
        logout: function ( ) {
            // ajax JSONP call for invalidating access_token
            $.ajax( {
                beforeSend: function(xhr) {
                    xhr.setRequestHeader( "appKey", this._getAppkey( ) );
                },
                type: "get",
                url: "https://oneid.skplanetx.com/oauth/expireToken",
                data:  {
                    "client_id": this.client_id,
                    "token": this._getAccessToken( )
                },
                dataType: "jsonp",
                context: this,
                callback: "this.logoutCallback",
                success: function ( data ) {
                    this._clearToken();
                    return this.SUCCESS_LOGOUT;
                },
                error: function(jqXHR, textStatus, errorThrown){
                    // exeption handling for sever-side not supporting JSONP
                    if (jqXHR.status === 200 ) {
                        this._clearToken();
                        return this.SUCCESS_LOGOUT;
                    }
                    // error handling
                    if (jqXHR.status === 0) {
                        alert("error 0: Network Problem");
                    } else if (jqXHR.status === 401) {
                        alert("error 401: Unauthorized");
                        location.href = "https://developers.skplanetx.com/login/";
                    } else if (jqXHR.status === 403) {
                        alert("error 403: Forbidden");
                    } else if (jqXHR.status === 404) {
                        alert("error 404: Not Found");
                    } else if (jqXHR.status === 412) {
                        alert("error 412: Precondition Failed ");
                    } else if (jqXHR.status === 500) {
                        alert("error 500: Internal Server Error");
                    } else {
                        alert("error " + jqXHR.status );
                    }
                    return this.ERROR_LOGOUT;
                }
            });
        },
        /**
         * @function getLoginStatus
         */
        getLoginStatus: function ( ) {
            return this._loginStatus;
        },
        /**
         * @function logoutCallback
         */
        logoutCallback: function ( data ) {
            // not yet in the server-side
        },
        /**
         * @function _setAppkey
         */
        _setAppkey: function ( appkey ) {
            this.appkey = appkey;
        },
        /**
         * @function _getAppkey
         */
        _getAppkey: function ( ) {
            return this.appkey;
        },
        /**
         * @function _saveToken
         */
        _saveToken: function ( token ) {
            var current_time = new Date();
            this._access_token_time = current_time.getTime() / 1000 ;
            // first check window.localStorage
            if ( window.localStorage ){
                localStorage.setItem ( "token", token );
                localStorage.setItem ( "tokentime", this._access_token_time );
            } else { // second check cookie
                doc.cookie += ("token=" + token + ";" ) ;
                doc.cookie += ( "tokentime="  + this._access_token_time + ";" ) ;
            }
        },

        /**
         * @function _loadToken
         */
        _loadToken: function ( ){
            // first check window.localStorage
            if ( window.localStorage ){
                this._access_token = localStorage.getItem( "token" );
                this._access_token_time = localStorage.getItem( "tokentime" );

            } else { // second check cookie
                var cookieArray = doc.cookie.split( ";" );
                for ( var i in cookieArray ) {
                    if ( cookieArray[i].match( "token=" ) ) {
                        this._access_token = cookieArray[i].substr( cookieArray[i].indexOf( "=" )+1 );
                    } else if ( cookieArray[i].match( "tokentime=" ) ) {
                        this._access_token_time = cookieArray[i].substr( cookieArray[i].indexOf( "=" )+1 );
                    }
                }
            }
            // token validation check
            var current_date = new Date();
            current_time = current_date.getTime() / 1000 ;
            if ( !this._access_token || !this._access_token_time ||	( this._access_token_time_limit - ( current_time - this._access_token_time ) ) < 0 ) {
                this._clearToken();
                this._loginStatus = false;
            } else if ( !!this._access_token && !!this._access_token_time ) {
                this._loginStatus = true;
            }
        },
        /**
         * @function _clearToken
         */
        _clearToken: function () {
            if ( window.localStorage ) {
                localStorage.removeItem( "token" );
                localStorage.removeItem( "tokentime" );
            } else {
                this._saveToken( "" );
            }
            this._access_token = "";
            this._access_token_time = "";
        },
        /**
         * @function _checkAccessToken
         */
        _checkAccessToken: function () {
            // get access token from local storage or cookie
            this._loadToken( );
            // get access token from location.hash , this value has higher priority.
            if ( window.location.hash ) {
                var hashString = window.location.hash.substring(1),
                    pattern = /^access_token/,
                    result = hashString.match( pattern );
                if ( result !== null ) {
                    this._access_token = window.location.hash.slice( this._access_token_start, this._access_token_end );
                    this._saveToken( this._access_token );
                    this._loginStatus = true;
                }
            }
        },
        /**
         * @function _getAccessToken
         */
        _getAccessToken: function () {
            return this._access_token;
        },
        /**
         * @function api
         */
        api: function ( queryMethod, queryURL, queryAccept, queryData, successCallback, failCallback, userSetting ) {
            // parameter check
            if ( !queryMethod || !queryURL || !queryAccept || !queryData || !successCallback ) {
                return this.ERROR_PARAMETER_MISSING;
            }
            // ajax request configure
            var that = this,
                queryObject = {
                    type: queryMethod,
                    url: queryURL,
                    dataType: queryAccept,
                    data: queryData,
                    success: successCallback,
                    error: failCallback
                };
            var ajaxRequest = function( ) {
                var activeXModes=["Msxml2.XMLHTTP", "Microsoft.XMLHTTP"]; //activeX versions to check for in IE
                for ( var i = 0, max = activeXModes.length; i < max; i += 1 ){
                    try{
                        return new ActiveXObject(activeXModes[i]);
                    } catch(e){
                        //suppress error
                        return null;
                    }
                }
            };
            var myGetRequest;
            // default error handling function
            if ( !failCallback ) {
                queryObject.error =  function(jqXHR, textStatus, errorThrown){
                    if ( this.isIE ) {
                        alert("Ajax fail callback is called");
                    }
                    if (jqXHR.status === 0 ) {
                        alert("jqXHR.status 0: Network Problem");
                    } else if (jqXHR.status === 401) {
                        alert("jqXHR.status 401: Unauthorized");
                        // location.href = "https://developers.skplanetx.com/login/";
                    } else if (jqXHR.status === 403) {
                        alert("jqXHR.status 403: Forbidden");
                    } else if (jqXHR.status === 404) {
                        alert("jqXHR.status 404: Not Found");
                    } else if (jqXHR.status === 412) {
                        alert("jqXHR.status 412: Precondition Failed ");
                    } else if (jqXHR.status === 500) {
                        alert("jqXHR.status 500: Internal Server Error ");
                    } else {
                        alert("jqXHR.status " + jqXHR.status );
                    }
                };
            }
            // defualt setting for ajax request
            var defaultSetting = {
                beforeSend: function(xhr) {
                    xhr.setRequestHeader( "appKey", that._getAppkey( ) );
                },
                data: {
                    "version": 1
                },
                cache: false
            };
            // public API doesn't have accessToken ...
            if ( that._getAccessToken() !== "" ) {
                defaultSetting.data.access_token = that._getAccessToken( );
            }
            // merging queryObject with defaultSetting object
            $.extend(  true, queryObject, defaultSetting );
            // user setting
            if ( !!userSetting ) {
                $.extend(  true, queryObject, userSetting );
            }
            // Use Microsoft XDR for IE browser
            if ( this.isIE ) {
                myGetRequest = new ajaxRequest();
                myGetRequest.onreadystatechange = function() {
                    if (myGetRequest.readyState === 4){
                        if ( myGetRequest.status === 200 || window.location.href.indexOf( "http" ) === -1 ){
                            if ( !myGetRequest.responseType || myGetRequest.responseType === "JSON" || myGetRequest.responseType == "json" ) {
                                successCallback( jQuery.parseJSON( myGetRequest.responseText ) );
                            } else if ( myGetRequest.responseType === "XML" || myGetRequest.responseType === "xml" ) {
                                successCallback( jQuery.parseXML( myGetRequest.responseText ) );
                            }
                        } else{
                            if ( failCallback ) {
                               failCallback();
                            }
                        }
                    }
                };
                // get
                if ( queryMethod === "GET" || queryMethod === "get") {
                    try {
                        myGetRequest.open( queryMethod, queryURL + "?" + jQuery.param( queryData ), true );
                    } catch (e) {
                        alert( "브라우저가 AJAX를 지원하지 않습니다. !\n인터넷 옵션->보안->사용자 지정 수준->도메인간 데이터 원본 엑세스->확인 혹은 사용으로 활성화해주세요");
                        return false;
                    }
                } else if ( queryMethod === "POST" || queryMethod === "post" ) {
                    myGetRequest.open( queryMethod, queryURL , true);
                }
                myGetRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                myGetRequest.setRequestHeader('appkey', that._getAppkey() );
                // get
                if ( queryMethod === "GET" || queryMethod === "get") {
                    myGetRequest.send(null);
                } else if ( queryMethod === "POST" || queryMethod === "post") { // post
                    myGetRequest.send( jQuery.param( queryData ) );
                }
            } else { // other browsers except IE browser ...
                $.ajax( queryObject );
            }
            return this.SUCCESS_API;
        } //end api
    }; // end of prototype
    // assign PlanetX object to window object
    window.PlanetX = new PlanetX( );
}) ( jQuery, window );
