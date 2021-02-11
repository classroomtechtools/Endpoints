import {describe, it, assert} from '@classroomtechtools/unittesting';
import {Log} from './lib/log.js';

if (remote) Log();

describe("interacting incorrectly with endpoint that produces 404", _ => {
  const endpoint = createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
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
  const SheetsUpdateEndpoint = createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');
  const ids = ['1Z3AVtlz3ZwwkV5Hl8MfhQEl4vo5VYysjb0BfhAtVt_g', '1fZgGhMsLPFeI_7Jhl2vE7SFJDh6AEBVVWs4wSjn-yMg'];
  const ssBatch = batch();

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
    ssBatch.add({request});
  });

  const responses = ssBatch.fetchAll();
  it("responses has length of 2", _ => {
    const actual = responses.length;
    const expected = 2;
    assert.equals({actual, expected});
  });
});

describe("using service account to create", _ => {
  // tester must fill in valid values for email/privateKey to test, instructions are to make service account and download json credentials
  const {utgs__issuerEmail, utgs__privateKey} = PropertiesService.getUserProperties().getProperties();

  const oauth = makeGoogOauthService('Chat', utgs__issuerEmail, utgs__privateKey, ['https://www.googleapis.com/auth/chat.bot']);
  const endpoint = createGoogEndpointWithOauth('chat', 'v1', 'spaces', 'list', oauth);
  const request = endpoint.httpget();
  const response = request.fetch();
  it("Spaces available", _ => {
    const actual = response.json.spaces;
    assert.notUndefined({actual});
  });
});

describe("http get requests to sheets v4 service, expected to fail", _ => {
  const endpoint = createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
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
  const req = createRequest('get', {url: wpurl});

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

