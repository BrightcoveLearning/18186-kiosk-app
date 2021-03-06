videojs.registerPlugin('kioskApp', function() {
  var myPlayer,
    totalCalls,
    callNumber = 0,
    allVideoObjects = [],
    currentlyPlayingIndex,
    // Build options needed for CMS API request
    options = {},
    baseURL = "https://cms.api.brightcove.com/v1/accounts/",
    accountId = "1752604059001";

  options.proxyURL = "https://solutions.brightcove.com/bcls/bcls-proxy/brightcove-learning-proxy-v2.php";
  options.requestType = "GET";

  videojs.getPlayer('myPlayerID').ready(function() {
    myPlayer = this;
    // Define key variables
    var videoIDs = [],
      videoObjects = [],
      videoCount,
      videoIDRequest = {},
      videoCountRequest = {};

    // +++ Setup for video count CMS API request +++
    setRequestData("getCount");
    // Use CMSAPI to get video count
    makeRequest(options, function(countData) {
      // Convert response string into JSON
      JSONcount = JSON.parse(countData);
      // Extract count from returned data
      videoCount = JSONcount.count;
      // Calculate number of calls that must be made
      // ask for 25 at a time (recommended best practice)
      totalCalls = Math.ceil(videoCount / 25);
      // Loop over requests for videos
      do {
        // Setup for video info CMS API request
        setRequestData("getIDs");
        // Use CMS API to get each block of videos
        makeRequest(options, function(videoData) {
          // Convert response string into JSON
          JSONvideos = JSON.parse(videoData);
          // Call function to extract IDs from video info
          videoIDs = extractVideoData(JSONvideos);
          // Call function to get video objects per IDs
          getVideoData(videoIDs, function(videoObjects) {
            //Push returned array into master array
            Array.prototype.push.apply(allVideoObjects, videoObjects);
            console.table(allVideoObjects);
            // Check if all video objects have been returned
            if (allVideoObjects.length === videoCount) {
              // If all video objects returned, call function to start playing first video
              beginPlayingVideos();
            }
          })
        });
        // Increment call number so calls eventually stop
        callNumber++;
      }
      while (callNumber <= totalCalls - 1);
    });

    // +++ Get next video +++
    /**
     * On end of each video progress to next video
     * or if the last video start again
     */
    myPlayer.on('ended', function() {
      if (currentlyPlayingIndex <= allVideoObjects.length) {
        currentlyPlayingIndex++;
        myPlayer.catalog.load(allVideoObjects[currentlyPlayingIndex]);
        myPlayer.play();
      } else {
        myPlayer.catalog.load(allVideoObjects[0]);
        myPlayer.play();
        currentlyPlayingIndex = 0;
      }
    }); // End of add event listener

  });

  /**
   * sets up the data for the API request
   */
   function setRequestData(task) {
     var videoName,
       requestURL,
       endPoint,
       requestData = {},
       dataReturned = false;
     // Determine if setting up to get video count or video IDs
     switch (task) {
       case "getCount":
         options.url = baseURL + accountId + "/counts/videos";
         break;
       case "getIDs":
         options.url =
           baseURL + accountId + "/videos?limit=25&offset=" + 25 * callNumber;
         break;
     }
   }

  // +++ Standard functionality for CSM API call +++
  /**
   * send API request to the proxy
   * @param  {Object} options for the request
   * @param  {String} options.url the full API request URL
   * @param  {String="GET","POST","PATCH","PUT","DELETE"} requestData [options.requestType="GET"] HTTP type for the request
   * @param  {String} options.proxyURL proxyURL to send the request to
   * @param  {String} options.client_id client id for the account (default is in the proxy)
   * @param  {String} options.client_secret client secret for the account (default is in the proxy)
   * @param  {JSON} [options.requestBody] Data to be sent in the request body in the form of a JSON string
   * @param  {Function} [callback] callback function that will process the response
   */
  function makeRequest(options, callback) {
    var httpRequest = new XMLHttpRequest(),
      response,
      requestParams,
      dataString,
      proxyURL = options.proxyURL,
      // response handler
      getResponse = function() {
        try {
          if (httpRequest.readyState === 4) {
            if (httpRequest.status >= 200 && httpRequest.status < 300) {
              response = httpRequest.responseText;
              // some API requests return '{null}' for empty responses - breaks JSON.parse
              if (response === "{null}") {
                response = null;
              }
              // return the response
              callback(response);
            } else {
              alert(
                "There was a problem with the request. Request returned " +
                  httpRequest.status
              );
            }
          }
        } catch (e) {
          alert("Caught Exception: " + e);
        }
      };
    /**
     * set up request data
     * the proxy used here takes the following request body:
     * JSON.strinify(options)
     */
    // set response handler
    httpRequest.onreadystatechange = getResponse;
    // open the request
    httpRequest.open("POST", proxyURL);
    // set headers if there is a set header line, remove it
    // open and send request
    httpRequest.send(JSON.stringify(options));
  }

  // +++ Extract video IDs  +++
  /**
   * extract video data from CMS API response
   * @param {array} cmsData the data from the CMS API
   * @return {array} videoData array of video info
   */
  function extractVideoData(cmsData) {
    var i,
      iMax = cmsData.length,
      videoItem,
      videoDataForReturn = [];
    for (i = 0; i < iMax; i++) {
      if (cmsData[i].id !== null) {
        videoItem = {};
        videoItem.id = cmsData[i].id;
        videoDataForReturn.push(videoItem);
      }
    }
    return videoDataForReturn;
  }

  /**
   * get video objects
   * @param {array} videoIds array of video ids
   * @return {array} videoData array of video objects
   */
  function getVideoData(videoIds, callback) {
    var i = 0,
      iMax = videoIds.length,
      videoObjectsForReturn = [];

    /**
     * makes catalog calls for all video ids in the array
     */
    getVideo();

    function getVideo() {
      if (i < iMax) {
        myPlayer.catalog.getVideo(videoIds[i].id, pushData);
      } else {
        callback(videoObjectsForReturn);
      }
    }

    /**
     * callback for the catalog calls
     * pushes the returned data object into an array
     * @param {string} error error returned if the call fails
     * @parap {object} video the video object
     */
    function pushData(error, video) {
      videoObjectsForReturn.push(video);
      i++;
      getVideo();
    }
  }

  // +++ Plays first video +++
  /**
   * Starts initial playback of videos
   */
  function beginPlayingVideos() {
    myPlayer.catalog.load(allVideoObjects[0]);
    myPlayer.play();
    currentlyPlayingIndex = 0;
}});
