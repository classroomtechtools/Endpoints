import test from 'ava';
import virtualgs from '@classroomtechtools/virtualgs';
import sinon from 'sinon';

test("Endpoints.$.createGoogEndpoint", async t => {
  const mocks = {
    "UrlFetchApp": {
      fetch: sinon.stub()
        .onFirstCall().returns({
          getContentText: sinon.stub()
            .returns('{"baseUrl": "https://sheets.googleapis.com/",   "resources":{"spreadsheets": {"methods":{"get": {"path": "v4/spreadsheets/{spreadsheetId}"}}}}, "sheets":"v4"}'),
          getAllHeaders: () => ({"Content-Type": "text/html; charset=UTF-8"}),
          getResponseCode: () => 200,
          statusCode: 200
        })
        .onSecondCall().returns({
          getContentText: sinon.stub()
            .returns('{"error": {"status": "", "message": "", "charset": "", "mime":""}, "text": "some text"}'),
          getAllHeaders: () => ({"Content-Type": "text/html; charset=UTF-8"}),
          getResponseCode: () => 200,
          statusCode: 200
        })
    }
  };
  const invoke = virtualgs('project', mocks);
  const Endpoints = await invoke('__mocklib');

  const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');

  t.true(mocks.UrlFetchApp.fetch.calledWith('https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'));

  const request = endpoint.httppost({spreadsheetId: '12345'});

  const response = request.fetch();

  let json;
  try {
    json = response.json;
    t.pass();
  } catch (e) {
    t.fail("Should not throw error");
  }

  let actual = Object.keys(json);
  let expected = ['error', 'text'];
  t.deepEqual(actual, expected, "comment");
  actual = Object.keys(json.error);
  expected = ['status', 'message', 'charset', 'mime'];
  t.deepEqual(actual, expected);
});
