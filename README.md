# Endpoints

A library SDK for Google AppsScripts that makes working with API endpoints a cinch. You can use it as an abstraction of `UrlFetchApp`, or use it to wrap Google APIs that don't have advanced services yet.

See the [documentation](https://classroomtechtools.github.io/Endpoints/).

## Example Libraries that use Endpoints:

- [Chat Advanced Service](https://github.com/classroomtechtools/chat-adv-service).

## Quickstart

Install:

- Library ID: `1WovLPVqVjZxkxkgCNgI3S_A3eDsX3DWOAoetZgRGW1JpGQ_9TK25y7mB`
- Project ID: `MOwaCM3sJzFttpUe7GAFibvD8R0iiSsw_`

Use instead of `UrlFetchApp.fetch`:

```js
function myFunction () {
  // create simple get request with query parameter
  const json = Endpoints.get('https://example.com', {
    query: {
      s: 'searchstring'
    }
  });

  // create simple post request with headers and payload
  const json = Endpoints.post('https://example.com', {
    payload: {
      key: 'value'
    },
    headers: {
      'Authorization': 'Basic ' + token;
    }
  });
}
```

Or use it to interact with Google APIs:

```js
function myFunction () {
  // creates endpoint with oauth as "me"
  const endpoint = Endpoints.createGoogEndpoint('sheets', 'v4', 'spreadsheet.values', 'get');

  // use endpoint object to create get or post requests
  const request = endpoint.httpget({spreadsheetId: '<id>'});

  // the request object has fetch method
  const response = request.fetch();

  // the response object has json property
  Logger.log(response.json);
}
```

Or use it to programmatically create differenet kinds of requests:

```js
function myFunction () {
  const request = Endpoints.createRequest('get', 'https://example.com');
  if (condition)
    request.addQuery({s: 'searchstring'});
  else
    request.addQuery({p: 'something'});
}
```

## Examples

### Download from Wikipedia

Wikipedia offers a great API to get us started learning how to use this library to make simple requests. 

```js
const wpurl = 'https://test.wikipedia.org/w/api.php';
const request = Endpoints.createRequest('get', wpurl);
```

The documentation for this API says we have to provide it some standard query parameters, so that there's an `?action=query` and `&format=json` tacked onto the end of the URL, so let's figure out how to add them.

We have a request object and we explore the `Request` class which indicates there is an `addQuery` method. 

```js
const query = {action: 'query', format: 'json'};
request.addQuery(query);
const url = request.url;
Logger.log(url);  // url includes the query parameters
```

The target API also requires a `titles` query parameter that indicates which article we are after:

```js
request.addQuery({titles: 'Albert_Einstein'});
request.url;  // the full url including previous query parameters
```

Let's reach out to the internet and get the response:

```js
const response = request.fetch();
if (!response.ok) throw new Error(`Status code ${response.statusCode}`);
const json = response.json;
Logger.log(json);  // the response as json
```

### Interact with Google APIs, in batch mode

Let's get real. We probably don't use Google AppsScripts to download wikipedia articles. We use it to build applications that depend somehow on Google APIs, such as the Spreadsheet API.

Imagine your application needs to write the exact same information to two different spreadsheet documents. Let's learn how to do that with batch operations.

We need to create an `Endpoint` object, instead of directly creating a `Request` object as we did before, which will then be used to build the needed `Request` object. First we need to get an endpoint object intended to be used with the target Google APIs:

```js
const endpoint = Endpoints.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');  
```

This refers to the Sheets `"sheets"` service, version `"v4"`, in the resource `"spreadsheets.values"` and the `"update"` method, which is the target endpoint that Google exposes for updating spreadsheets that we have in mind. We need to create a http `put` request with that endpoint. Documentation for this is [here](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update).

Now that we have an endpoint object, by looking through the `Endpoints` namespace, we find that `httpput` method which will allow us to prepare the request object:

```js
const request = endpoint.httpput(
  {    /* path parameters */		
    spreadsheetId: '<id>',
    range: 'Sheet1!A1'
  },{
    query: {
      valueInputOption: 'RAW'
    }
    payload: {
      range: 'Sheet1!A1',
      majorDimension: 'ROWS',
      values: [[1]]
    }
  }
);
```

That's how to do one, but how to do two programmatically? Let's use the batch functions. Imagine you need to update two different spreadsheets with the exact same info:

```js
const batch = Endpoints.batch();
const ids = ['<id1>', '<id2>'];
    
ids.forEach(id => {
	const request = endpoint.httpput({
    range: 'Sheet1!A1',
    spreadsheetId: id
  }, {
    query: {
      valueInputOption: 'RAW'
    },
    payload: {
      range: 'Sheet1!A1',
      majorDimension: 'ROWS',
      values: [[1]]
    }
  });

  batch.add(request);

});
    
const responses = batch.fetchAll();
```

You don't have to use the batch functions to create requests to the same endpoint. Any request that you can create with this library can be processed in batch mode, as long as the parameter to `add` is a `Request` object.


# To import as an npm module:

`npm install @classroomtechtools/endpoints`

The above will also install the following dependencies:

- @classroomtechtools/unittesting
- @classroomtechtools/enforce_arguments
