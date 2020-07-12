import {describe, it, assert} from '@classroomtechtools/unittesting';

import {Log} from './lib/log.js';

if (remote) Log();

(function shortform() {
  // mimic how to use it in library context
  const Endpoints = __mocklib();

  describe("interacting incorrectly with endpoint that produces 404", _ => {
    const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
    const request = endpoint.httppost({spreadsheetId: '12345'});
    const response = request.fetch();
    let json;
    assert.doesNotThrowError("parsing json on known 404 does not throw error", _ => {
      json = response.json;
    });
    it("json instead contains error object with message and information", _ => {
      let actual = Object.keys(json);
      let expected = ['error', 'text'];
      assert.arrayEquals({actual, expected});
      actual = Object.keys(json.error);
      expected = ['status', 'message', 'charset', 'mime'];
      assert.arrayEquals({actual, expected});
    });
  });

  describe("using batch mode to mirror spreadsheet writes", _ => {
    const SheetsUpdateEndpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');
    const ids = ['1Z3AVtlz3ZwwkV5Hl8MfhQEl4vo5VYysjb0BfhAtVt_g', '1fZgGhMsLPFeI_7Jhl2vE7SFJDh6AEBVVWs4wSjn-yMg'];
    const batch = Endpoints.$.initBatch();

    ids.forEach(id => {
      const request = SheetsUpdateEndpoint.createRequest('put',
        { /* path parameters */
          range: 'Sheet1!A1',
          spreadsheetId: id
        },{ /* query parameters */
          valueInputOption: 'RAW'
        },{ /* payload */
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: [[1]]
        }
      );
      batch.add({request});
    });

    const responses = batch.fetchAll();
    it("responses has length of 2", _ => {
      const actual = responses.length;
      const expected = 2;
      assert.equals({actual, expected});
    });
  });

  describe("using service account to create", _ => {
    // tester must fill in valid values for email/privateKey to test, instructions are to make service account and download json credentials
    const email = 'starting-account-m8b0jts7iwss@geek-squad-bot-1584535963981.iam.gserviceaccount.com'; // ''
    const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDSGqnJ6wlaB7Ki\nkB1fm4gsXPDI7ARM4PqAZChwfbUvRnMxzC3j0BSB5KEHS4yOM5gcaStwrPLifRKQ\nEBglckEYemkz57W9XZoYerVPXqmuU1ez/ZYhNGmeTXmmNVzYMGNr35/OPmCEBAgX\nsb9IX9XYNmp1SCzlW8MZelfH60brZtcDdb0OSp/aqkWGqmTcnzBcvUp9KKhRoZx5\ndUX6MmKq+epReYXpRtutdmRAXIknByfs9dffKZbT+d9yL+oP5mPNvgALqPHEugar\neH3X+OguwCetZBYH9H4BSZ7BSMSBA0X8+sj5tDwwNBdx8Cg7tC57wbzycI4lFA5Z\nBlg3CkVDAgMBAAECggEADnhlpJF6exKNUWLpkvx28XnpNNKvLSL66GgoMi8w5l5M\nxWuRkYodj3X78oZX2jIK0jzFZXo+iYN3CX2s8WSgFRvWg7ZRWbHI+3ygC3pdPLNi\nwUkVfkNKLuvuaphsROYi7Xq2WpGzO1m9EPIIrDxlfFcAbVluNicOwIIg6j+gX8qn\nyukpge7fjBPjHWNN2WsQalIHeeSh9E8eLPVHwZIZos0V9jGTQDTiXVhZIlp/bplk\nQIAYXEN03YHCDlwxljUsAm16VDo2pBaTlecgxXnmHnjs9hx3bwhYpqjXXB4wHqpH\nFHbimiRTLg5ypxaBZuiQeGromPCu/KTHMAb8gloZwQKBgQDxbIwc16KtsmPjBiT1\n7yi1Qn18t9jESsB34sT1Fboz2oPznFCiQzoIOoOhmSH62O54ovYo79mO2EjRSM9E\nNsnY3eJfnG+1I4bB5gKg3x6MvKR0/hDwYAj4ulQbplIO/y8SkQKf21nMbHctYrTv\n2dXdPACr8AX0s9sKoDjifru0IQKBgQDeygknzHX9OEg+2XeLDk6BTPdtDewPJ1rn\nq6+Tcsxu5As3sGcjj888s7wnIlzOVSh/ii6r6JLft2hBhXPIhFpLeY6jYazjt/zv\nBsHrdQ/rsWHtKFpM4CN/vM6kJ4/BPKZej1f4XBCq9IQ20szcFLKpccaRLcA6C5S3\nTDywRSgM4wKBgQC2o2J/81W7R8gvGBfgAbRvI8ThFAglv1NJnsFXk79QuQ+3vNp3\nVppRXUr1dm5xYalOlCHbKFASs2arBQTf2v7qVDmMEUGk7CJnD4WPhBuNZqyXYRkZ\nb915pSQ54qITfFN1HUS6AGw3rRqfuBufk9Ep09nCOQuYanPb3wgJuMxxYQKBgQDK\nJrSMAkAFVi5nqNeJu5+MP5Q6xekuDt2zXNthhUbuT8nF7DCJ2hGG2Oee8tUW+7pV\nj8KthcjPahIVccwPY9iyp0fAA/7mWaoOESmgRoX9rORYVsco/i/31hACb0tHYYrs\nPlDqME+Hb3sQa9Iq2DUM/wnX7ZWAlcWJVIm0v+uJVQKBgFns6ZjvwW1hVtPYwadQ\nIBWZhNnFu2wxeSKms/P4vXNcirl7lyYH5BzfAWE3ff0u8uR4E5wcTbi8ea/PLn4D\naQbf7M6Lb0S6ezZYzEjuXBGfL10MBMH4EXzz8cQQprYjcyYBb5MtPrd5zVGafGa4\n5jlOe/NbMqVN+gf7JO2YmJuC\n-----END PRIVATE KEY-----\n';  // ''
    const oauth = Endpoints.$.makeGoogOauthService('Chat', email, privateKey, ['https://www.googleapis.com/auth/chat.bot']);
    const endpoint = Endpoints.$.createGoogEndpointWithOauth('chat', 'v1', 'spaces', 'list', oauth);
    const request = endpoint.httpget();
    const response = request.fetch();
    it("Spaces available", _ => {
      const actual = response.json.spaces;
      assert.notUndefined({actual});
    });
  });

  describe("http get requests to sheets v4 service, expected to fail", _ => {
    const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
    const baseUrl = endpoint.baseUrl;

    it("Endpoint#baseUrl returns templated string of endpoint", _ => {
      const actual = baseUrl;
      const expected = 'https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}';
      assert.equals({actual, expected});
    });

    const substitutions = {spreadsheetId: 'id'};
    const request = endpoint.httpget(substitutions);

    const url = request.url;
    it("Request#getUrl returns url based on substitutions within baseUrl", _ => {
      const actual = url;
      const expected = 'https://sheets.googleapis.com/v4/spreadsheets/id';
      assert.equals({actual, expected});
    });

    const response = request.fetch();
    const ok = response.ok;

    it("Response#isOk indicates unsuccessful request", _ => {
      const actual = ok;
      const expected = false;
      assert.equals({actual, expected});
    });

    const status = response.statusCode;
    it("Response#statusCode indicates 403 error (permission denied)", _ => {
      const actual = status;
      const expected = 403;
      assert.equals({actual, expected});
    });

    const json = response.json;
    const headers = response.headers;
    it("Response#headers returns headers with Content-Type 'application/json; charset=UTF-8'", _ => {
      const actual = headers['Content-Type'];
      const expected = 'application/json; charset=UTF-8';
      assert.equals({actual, expected});
    });

    it("Response#json returns json with error.status set to 'PERMISSION_DENIED'", _ => {
      const actual = json.error.status;
      const expected = 'PERMISSION_DENIED';
      assert.equals({actual, expected});
    });

    const sendRequest = response.requestObject;
    it("Response#response returns the original request", _ => {
      const actual = sendRequest;
      assert.notUndefined({actual});
    });

    const sentHeaders = sendRequest.headers;
    it("Request#headers returns Authorization: Bearer", _ => {
      const collection = Object.keys(sentHeaders);
      const value = 'Authorization';
      assert.contains({value, collection});
    });

  });

  describe("http get request with no authentication", _ => {
    const wpurl = 'https://test.wikipedia.org/w/api.php';
    const page = 'Albert_Einstein';
    const req = Endpoints.$.createGetRequest(wpurl);

    it("internally, Request#query object starts with empty object", _ => {
      const actual = req.query;
      const expected = {};
      assert.objectEquals({actual, expected})
    });

    it("internally, Request#url is same as original passed", _ => {
      const actual = req.url;
      const expected = wpurl
      assert.equals({actual, expected});
    });

    req.addQuery({action: 'query', prop: 'images', format: 'json'});

    it("Request#addQuery appends query parameters to returned url", _ => {
      const actual = req.url;
      const expected = `${wpurl}?action=query&prop=images&format=json`;
      assert.equals({actual, expected})
    });

    req.addQuery({titles: page});

    it("Request#addQuery appends query parameters to url, keeping old values", _ => {
      const actual = req.url;
      const expected = `${wpurl}?action=query&prop=images&format=json&titles=Albert_Einstein`;
      assert.equals({actual, expected})
    });

    const resp = req.fetch(req);
    const ok = resp.ok;
    it("Response#ok returns true on success", _ => {
      const actual = ok;
      const expected = true;
      assert.equals({actual, expected});
    });

    const json = resp.json;
    it("Response#json returns parsed json", _ => {
      const actual = Object.keys(json);
      const expected = ['batchcomplete', 'query'];
      const comment = "test object keys as values might change over time";
      assert.arrayEquals({actual, expected, comment});
    });

    const status = resp.statusCode;
    it("Response#statusCode returns 200 on success", _ => {
      const actual = status;
      const expected = 200;
      assert.equals({actual, expected});
    });

  });
})();
