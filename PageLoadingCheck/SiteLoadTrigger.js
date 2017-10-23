/*  Copyright 2017 Ustat Singh
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE.txt', which is part of this source code package.
 */


console.log('Script Started');

var stateCheck = -1;

var port = chrome.runtime.connect({name: "FrontEndBasicPageLoadCheck"});
port.postMessage({Status: "Ready"});

port.onMessage.addListener(function(msg) {
    if (msg.question === "PageLoadedBasicCheck")
    {
        if (stateCheck !== -1)
        {clearInterval(stateCheck); console.log('statecheck cleared');}

        stateCheck = setInterval(() => PageLoadCheck(),100);

    }
    else if (msg.question === "AlertPageLoaded") {
        alert("PageLoaded");
    }


});


function PageLoadCheck() {

        if(document.readyState === 'complete')
    {
        clearInterval(stateCheck);
        port.postMessage({Status: "Loaded"});
        console.log('Page Load Fired');
        // document ready
    }

}