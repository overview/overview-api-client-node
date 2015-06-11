/**
 * A really simple "class" that defines a fluent interface
 * for working with the Overview API.
 *
 * @param {string} host The scheme + host of the API (e.g. https://overviewproject.org/)
 * @param {string} apiToken Your api token
 * @param {Object} requester A service used to make the request (e.g. oboe).
 *                           Will recieve a {url, body, method, headers} object.
 */
function API(host, apiToken, requester) {
  this.host = host;
  this.requester = requester;
  this.apiTokenEncoded = new Buffer(apiToken+':x-auth-token').toString('base64');

  // state set and maintained by the fluent interface.
  // mode is "doc" or "store".
  this.mode;
  this.docSetId;
  this.docId;
  this.storeObjectId;
}

/**
 * Set the API instance into doc mode with the provided doc set.
 *
 * @param {Number} docSetId The id of the document set to apply subsequent commands on.
 * @return {API} this
 */
API.prototype.docSet = function(docSetId) {
  this.mode = "doc";
  this.docSetId = docSetId;
  return this;
}

/**
 * Set the API instance into doc mode with the specified document.
 *
 * @param {Number} docId The id of the document to apply subsequent commands on.
 * @return {API} this
 */
API.prototype.doc = function(docId) {
  if(!this.docSetId) {
    throw new Error("You must specify a doc set id before picking out a document.");
  }

  this.mode = "doc";
  this.docId = docId;
  return this;
}

/**
 * Set the API instance into store mode.
 *
 * @return {API} this
 */
API.prototype.store = function() {
  this.mode = "store";
  return this;
}

/**
 * Set the API instance into doc mode with the specified store object.
 *
 * @param {Number} storeObjectId The id of the storeObject for subsequent commands.
 * @return {API} this
 */
API.prototype.object = function(storeObjectId) {
  this.mode = "store";
  this.storeObjectId = storeObjectId;
  return this;
}

/**
 * Send a request for the ids of the documents in the current docset.
 *
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.getIds = function(requester) {
  if(!this.docSetId) {
    throw new Error("Must call docSet() with a set id before using this method.");
  }

  return this._request(
    "/document-sets/" + this.docSetId + "/documents?fields=id",
    requester
  );
};

/**
 * Send a request for all the documents in the current docset.
 *
 * @param {string[]} fields The fields to return for each doc. Default: id & text.
 * @param {string} sort (Optional) A sort string to apply to the documents.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.getDocuments = function(fields, sort, requester) {
  if(!this.docSetId) {
    throw new Error("Must call docSet() with a set id before using this method.");
  }

  var sortParam = sort ? "&sort=" + sort : "";
  var fieldsParam = "&fields=" + (fields || ["id", "text"]).join(",");
  var path = "/document-sets/" + this.docSetId + "/documents?stream=true" + fieldsParam + sortParam;

  return this._request(path, requester);
}

/**
 * Send a request for the previously-specified document, document set, or store object.
 *
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @throws {Error} If a document set, document, or store object hasn't been previously specified.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.get = function(requester) {
  switch(this.mode) {
    case "doc":
      // request a particular document, if one's been specified
      if(this.docId) {
        var path = "/document-sets/" + this.docSetId + "/documents/" + docId;
        return this._request(path, requester);
      }

      // otherwise, get all documents, with the default fields + sorts
      return this.getAllDocuments(undefined, undefined, requester);

    case "store":
      // request a particular store object, if one's been specified
      if(this.storeObjectId) {
        return this._request("/store/objects/" + this.storeObjectId, requester);
      }

      // otherwise, we don't know whether to return an object or the state.
      throw new Error("Must specify a specific store object to return first");

    default:
      throw new Error("Must specify a document set, document, or store object first.");
  }
};


/**
 * Get the store's state.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.getState = function(requester) {
  if(this.mode !== "store") {
    throw new Error("You must be operating on the store to set state.");
  }

  return this._request('/store/state', requester);
}

/**
 * Set the store's state.
 * @param {Object} state The new state to set it to.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.setState = function(state, requester) {
  if(this.mode !== "store") {
    throw new Error("You must be operating on the store to set state.");
  }

  return this._request('/store/state', requester, 'PUT', state);
}

/**
 * Send a request for all the store's objects.
 * @param {Object} state The new state to set it to.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.getObjects = function(requester) {
  if(this.mode !== "store") {
    throw new Error("You must be operating on the store to get its objects.");
  }

  return this._request('/store/objects', requester);
}

/**
 * Send a request to create an object in the store.
 * @param {Object} state The state for the new object.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.createObject = function(state, requester) {
  return this._request('/store/objects', requester, 'POST', state);
}

/**
 * Send a request to update a given object in the store.
 * @param {Object} state The state for the new object.
 * @param {Object} requester (Optional) A requester to use instead of this.requester.
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype.updateStoreObject = function(state, requester) {
  if(!this.storeObjectId) {
    throw new Error("You must specify a store object id before calling this method.");
  }

  return this._request('/store/objects/' + this.storeObjectId, requester, 'PUT', state);
}


/**
 * Make the API request
 * @private
 * @return {Object} The return value of calling the requester to make the request.
 */
API.prototype._request = function(path, requester, method, body) {
  requester = requester || this.requester;

  if(typeof requester !== "function") {
    throw new Error(
      "You must provide a requester function when " +
      "constructing the class or making the request."
    );
  }

  var headers = {
    "Authorization": 'Basic ' + this.apiTokenEncoded
  };

  if(body) {
    headers["Content-Type"] = "application/json";
  }

  return requester({
    url: this.host + '/api/v1' + path,
    body: body,
    method: method || "GET",
    headers: headers
  });
}

module.exports = API;
