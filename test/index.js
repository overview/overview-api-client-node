var API = require('../index')
var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require("sinon-chai");
var expect = chai.expect;
chai.use(sinonChai);

describe("The API Client", function() {
  var fallbackRequester = sinon.spy();
  var client = new API("https://google.com", "testToken", fallbackRequester);
  var tokenEncoded = new Buffer("testToken"+':x-auth-token').toString('base64');

  describe("Basics", function() {
    var requester = sinon.spy();
    client.store().getState(requester);
    var requesterData = requester.firstCall.args[0];

    it("should make requests with the correct auth header", function() {
      expect(requesterData.headers.Authorization).to.equal("Basic " + tokenEncoded);
    });

    it("should make requests to the correct host", function() {
      expect(requesterData.url).to.match(/^https\:\/\/google.com\//i);
    });
  });

  describe("Document mode", function() {
    describe("Requesting all documents", function() {
      var requester = sinon.spy();
      client.docSet("my-docs").getDocuments(["blargh"], undefined, requester);
      var requesterData = requester.firstCall.args[0];

      it("should request a stream", function() {
        expect(requesterData.url).to.match(/stream=true/);
      });

      it("should respect fields", function() {
        expect(requesterData.url).to.match(/fields=blargh(&|$)/);
      })

    });
  });
});
