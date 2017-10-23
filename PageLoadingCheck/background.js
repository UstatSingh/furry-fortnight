/*  Copyright 2017 Ustat Singh
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE.txt', which is part of this source code package.
 */


var request_count = 0;
var requests = {};
var tabid =-999;
var frontEndStatus = "Not Ready";
var timeSinceCountZero;
var stateCheck = -1;
var myPort;
var urlMonitored;
var masterTimeout;
var webNavOnCompleteFired = false;
var stopAllEvents = false;
var webNavResetIDs  = [];

//Connect to the front end script
chrome.runtime.onConnect.addListener(function(port) {
    console.assert(port.name === "FrontEndBasicPageLoadCheck");

    port.onMessage.addListener(function(msg,sender) {
        if (sender.sender.tab.id !== tabid)
          return;

        myPort = port;
        frontEndStatus = msg.Status;


    });
});

//Check for web navigation conpleted event fired by the tabb.
chrome.webNavigation.onCompleted.addListener(function(details) {

  if (details.tabId === tabid )
  {
    if(details.frameId === 0) {
        webNavOnCompleteFired = true;
        webNavResetIDs = [];
        console.log('webNavComplete Fired for main window');
    }
    else if (webNavResetIDs.indexOf(details.frameId) > -1) {
        webNavResetIDs.remove(details.frameId);

        if (webNavResetIDs.length === 0)
        {
            webNavOnCompleteFired = true;
        }

    }

      console.log('webNavComplete Fired', details.frameId);
  }


});

//Check for a navigation change being fired by front end (helpful for SPA's
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {

    if (details.tabId === tabid)
    {
        webNavResetIDs.push(details.frameId);
        defaultLoad();
        webNavOnCompleteFired = false;
        console.log('webNavComplete reset ', details.frameId);
    }

});


//Check if tab updated and url has changed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo,tab) {


  if (tabId === tabid) {
    stopAllEvents = false;
      console.log(tabId, tab.url, tab.status);
      if (urlMonitored !== null && urlMonitored !== tab.url) {
          request_count = 0;
          requests = {};

          if (stateCheck !== -1)
          {clearInterval(stateCheck); console.log('statecheck cleared');}

          console.log(urlMonitored, '- was original url, this is the new url -', tab.url)
      }

      urlMonitored = tab.url;
      defaultLoad();
  }

});

//Turn on this script for the tab where the icon is clicked
chrome.browserAction.onClicked.addListener(function(tab) {
  tabid = tab.id;
    chrome.tabs.executeScript(null, {file: "SiteLoadTrigger.js"});

console.log('tabid is', tabid);
    defaultLoad();
chrome.webRequest.onSendHeaders.addListener(
    function(info) {
        if (stopAllEvents)
        {return;}
        defaultLoad();
      var path = getPathFromUrl(info.url);
        console.log("URL of request - " + path );
        request_count = request_count + 1;
    if ( path in requests)
    {  requests[path] = requests[path] +1;}
    else
    { requests[path] = 1;}

    timeSinceCountZero = new stopWatch();

    }, {urls: [ "<all_urls>" ],tabId:tabid},['requestHeaders']);

//mark request done if its redirected
chrome.webRequest.onBeforeRedirect.addListener(
    function(removeRedirected) {
        if (stopAllEvents)
        {return;}
        var path = getPathFromUrl(removeRedirected.url);
        console.log("URL of request redirected - " + path );
        removeMyRequest(path);
    }, {urls: [ "<all_urls>" ],tabId:tabid},['responseHeaders']);

//Mark request done if it completed
chrome.webRequest.onCompleted.addListener(
    function(removeCompleted) {
        if (stopAllEvents)
        {return;}
        var path = getPathFromUrl(removeCompleted.url);
        console.log("URL of request completed - " + path );
        removeMyRequest(path);
    }, {urls: [ "<all_urls>" ],tabId:tabid},['responseHeaders']);


//mark request done if it threw an error
chrome.webRequest.onErrorOccurred.addListener(
    function(removeCompleted) {
        if (stopAllEvents)
        {return;}
        var path = getPathFromUrl(removeCompleted.url);
        console.log("URL of request errored - " + path );
        removeMyRequest(path);
    },{urls: [ "<all_urls>" ],tabId:tabid});


});

function getPathFromUrl(url) {
    return url.split(/[?#]/)[0];
}

function removeMyRequest(url){

    if ((url in requests) && requests[url] > 0) {
        requests[url] = requests[url] - 1;
        request_count = request_count - 1;
    }

    if (request_count === 0)
    {
      console.log('Count is now 0');
        timeSinceCountZero.start();
        //Check if the page load event has fired
        CheckIfFrontEndLoadFired();
    }
}

function CheckIfFrontEndLoadFired()
{
    if(frontEndStatus !== "Not Ready") {
        myPort.postMessage({question: "PageLoadedBasicCheck"});
        if(stateCheck !== -1) {
            clearInterval(stateCheck);
        }

         stateCheck = setInterval( () => finalCheck(),100);
    }
}

function finalCheck() {
  console.log(frontEndStatus,request_count,timeSinceCountZero.time());
    if ((frontEndStatus === "Loaded") && ( request_count === 0) && (timeSinceCountZero.time() > 500 ) &&(webNavOnCompleteFired)) {
        clearInterval(stateCheck);
        clearDefaultLoad()
        myPort.postMessage({question: "AlertPageLoaded"});
        stopAllEvents = true;
        console.log('PageLoadedSuccessFully');

    }
}
var	stopWatch = function() {
    var	startAt	= 0;

    var	now	= function() {
        return (new Date()).getTime();
    };


    this.start = function() {
        startAt	= startAt ? startAt : now();
    };

    this.time = function() {
        return (startAt ? now() - startAt : 0);
    };
};

//Used to check if no requests have cone in for 3 seconds and ignore long running requests.
function defaultLoad() {

  if (frontEndStatus !== "Not Ready") {
      if (masterTimeout !== null) {
          clearDefaultLoad();
      }
      masterTimeout = setTimeout(function () {
          console.log("Default Page Loaded");
          stopAllEvents = true;
          myPort.postMessage({question: "AlertPageLoaded"});
          clearInterval(stateCheck);
          request_count = 0;
          requests = {};
      }, 3000);
  }
}

function clearDefaultLoad() {
    clearTimeout(masterTimeout);
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};