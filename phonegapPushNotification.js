angular.module('phonegapPushNotification', [])
.factory('logger',['$log','$q', function($log,$q){
    var defer = $q.defer();
    this.status = "";

    return{
        log:function(txt){
            $log.log(txt);
            this.status += txt + "\n";
            defer.notify(this.status);
        },
        error:function(txt){
            $log.error(txt);
            this.status += txt + "\n"; 
            defer.notify(this.status);
        },
        getStatus:function(){
            return defer.promise;
        },
        resetStatus:function(){
            this.status = "";
            defer.notify(this.status);
        }
    }
}])

.factory('deviceIdStorage',['$q', '$interval', function($q, $interval){
    var androidDeviceId = null;
    var iosDeviceId = null;

    var stopInterval = function(intervalVar) {
        if (angular.isDefined(intervalVar)) {
          $interval.cancel(intervalVar);
          intervalVar = undefined;
         }
    }

    return {
        setAndroidDeviceId : function(deviceId){
            androidDeviceId = deviceId;
        },
        getAndroidDeviceID : function(){
            var defer = $q.defer();

            var androidCatchValueInterval = $interval(function(){
                if(androidDeviceId!=null)
                {
                    defer.resolve(androidDeviceId);
                    stopInterval(androidCatchValueInterval);
                }
            },100);
          

          return defer.promise;
        },
        setIosDeviceId : function(deviceId){
            iosDeviceId = deviceId;
        },
        getIosDeviceId : function(){
            var defer = $q.defer();

            var iosCatchValueInterval = $interval(function(){
                if(iosDeviceId!=null)
                {
                    defer.resolve(iosDeviceId);
                    stopInterval(iosCatchValueInterval);
                }
            },100);

            return defer.promise;
        }
    }
}])

.factory('pushNotificationPlugin', ['$window', function($window){
    return {
        get: function () {
            if(typeof $window.plugins !== 'undefined' && 
             typeof $window.plugins.pushNotification !== 'undefined')
            {
                return $window.plugins.pushNotification;
            }
            else
            {
                return {
                    setApplicationIconBadgeNumber : function(success, error, count){},
                    register : function(success,error,params){
                        if(ionic.Platform.isIOS())
                        {
                            success("APNSSAMPLEIDXXXXXXXXXXXXXXXXXXXXXXXXX");
                        }
                        if (ionic.Platform.isAndroid()) {
                            success("");
                            var e = {
                                event: "registered",
                                regid: "GCMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            }
                            $window.onNotificationGCMEvent(e);
                        };
                    },
                    unregister: function(success,error,options){
                        success('');
                    }
                }
            }
        }
    };
}])

.factory('gcmNotificationService', ['$rootScope', 'logger', 'deviceIdStorage', 'pushNotificationPlugin',
                            function($rootScope, logger, deviceIdStorage, pushNotificationPlugin) {
    var successHandlerForSettingBadge = function(result){},
    errorHandlerForSettingBadge = function(){};

    var notificationHandler = function(e) {
        logger.log("handleNotification event: "+e.event);
        switch (e.event) {
            case 'registered':
                if (e.regid.length > 0) 
                    deviceIdStorage.setAndroidDeviceId(e.regid);
                break;

            case 'message':
                // showNotificationPopup(e);
                logger.log(JSON.stringify(e));
                $rootScope.$broadcast('receivedPushNotification', e);
                break;

            case 'error':
                logger.error('gcmNotificationService: handleNotification - GCM error = ' + e.msg);
                break;

            default:
                logger.error('gcmNotificationService: An unknown GCM event has occurred');
                break;
        }

    }

    return {
        handleNotification: notificationHandler
    };
}])

.factory('applePushNotificationService', ['logger', '$rootScope', 'pushNotificationPlugin', 
                                    function(logger, $rootScope, pushNotificationPlugin) {

    var successHandlerForSettingBadge = function(result){
        logger.log("set application icon badge");
    },
    errorHandlerForSettingBadge = function(){};

    var setIconBadge = function(badge){
        pushNotificationPlugin.get().setApplicationIconBadgeNumber(successHandlerForSettingBadge, errorHandlerForSettingBadge, e.badge);
    }

    var notificationHandler = function(e){
        logger.log(JSON.stringify(e));

        if ( e.alert )
        {
            $rootScope.$broadcast('receivedPushNotification', e);
        }
        if ( e.badge )
        {
            setIconBadge(e.badge);
        }
    }

    return {
        handleNotification: notificationHandler,
        setBadge: setIconBadge
    };
}])

.factory('GCMRegistrationService', ['logger', 'pushNotificationPlugin', 
                            function(logger, pushNotificationPlugin) {

    return {      
        registerOnGCM: function(gcmProjectNumber) {
            var successHandler = function (result) {
                logger.log("GCMRegistrationService: Device is succesfully registered");
            },
            errorHandler = function (error) {
                logger.error('Error registering device on GCM error:'+error);
            };            
            logger.log('registerOnGCM: registering on android for GCM project number:'+gcmProjectNumber);
            pushNotificationPlugin.get().register(successHandler, errorHandler, {
                "senderID": gcmProjectNumber, /* Your Google Developers Console Project Number. See /www/js/configuration.js  */
                "ecb": "onNotificationGCMEvent" /* index.html function name*/
            });
        },
        unRegisterOnGCM:function(){
            var successHandler = function (result) {
                logger.log("GCMRegistrationService: unregistered device succesfully");
            },
            errorHandler = function (error) {
                logger.error('GCMRegistrationService: an error occured while unregistering device:'+error);
            };            
            pushNotificationPlugin.get().unregister(successHandler, errorHandler, {});
        }
    };
}])

.factory('APNRegistrationService', ['logger', 'deviceIdStorage', 'pushNotificationPlugin', 
                                function(logger, deviceIdStorage, pushNotificationPlugin) {

        return {
            registerOnAPN: function() {

                var errorHandler = function (error) {
                    logger.error('Error registering device on APN error:'+error);
                },
                tokenHandler = function (token) {
                    logger.log("APNRegistrationService - tokenHandler: device token = " + token);
                // RegisterDeviceIdService.save("apns",token);
                deviceIdStorage.setIosDeviceId(token);
            };            
            logger.log('registerOnAPN: registering on ios');
            pushNotificationPlugin.get().register(tokenHandler, errorHandler, {
              'badge': 'true',
              'sound': 'true',
              'alert': 'true',
              'ecb': 'onNotificationAPNEvent'
          });
        },
        unRegisterOnAPN: function(){
            var successHandler = function (result) {
                logger.log("APNRegistrationService: unregistered device succesfully");
            },
            errorHandler = function (error) {
                logger.error('APNRegistrationService: an error occured while unregistering device:'+error);
            };            
            pushNotificationPlugin.get().unregister(successHandler, errorHandler, {});
        }
    };
}])

.factory('PushNotificationService',['$rootScope', '$window', 'deviceIdStorage', 'gcmNotificationService', 'applePushNotificationService', 'logger', 'GCMRegistrationService', 'APNRegistrationService',
    function($rootScope, $window, deviceIdStorage, gcmNotificationService, applePushNotificationService, logger, GCMRegistrationService, APNRegistrationService){
        var alreadyRegisteredOnGCM = false;
        var alreadyRegisteredOnAPN = false;

        var listenOnGCMNotificationEvent = function(){
            $window.onNotificationGCMEvent = gcmNotificationService.handleNotification;  
        } 

        var listenOnAPNSNotificationEvent = function(){
            $window.onNotificationAPNEvent = applePushNotificationService.handleNotification; 
        }

        return {   
            registerOnGCM : function(gcmProjectNumber) {
                if (!alreadyRegisteredOnGCM) {
                    logger.log("== Push Notification Service Started For GCM ==");  
                    alreadyRegisteredOnGCM = true;
                    listenOnGCMNotificationEvent();
                    GCMRegistrationService.registerOnGCM(gcmProjectNumber);
                }
                return deviceIdStorage.getAndroidDeviceID();
            },
            unRegisterOnGCM : function() {
                if (alreadyRegisteredOnGCM) {
                    GCMRegistrationService.unRegisterOnGCM();
                    alreadyRegisteredOnGCM = false;
                }
            },        
            registerOnAPN : function()  {
                if (!alreadyRegisteredOnAPN) {
                    logger.log("== Push Notification Service Started For Apns ==");  
                    alreadyRegisteredOnAPN = true;
                    APNRegistrationService.registerOnAPN();
                    listenOnAPNSNotificationEvent();    
                }
                return deviceIdStorage.getIosDeviceId();                   
            },
            unRegisterOnAPN : function()  {
                if (alreadyRegisteredOnAPN) {
                    APNRegistrationService.unRegisterOnAPN();
                    alreadyRegisteredOnAPN = false;
                }
            },
            handlePushNotification : function(callback){
                $rootScope.$on('receivedPushNotification', function(event, data) { callback(data); });
            },
            setIosIconBadge : function(badgeNumber){
                applePushNotificationService.setBadge(badgeNumber);
            } 
        } 
    }])
