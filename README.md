# Endpoints

[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/Naereen/StrapDown.js/blob/master/LICENSE) 



A library SDK for APIs in Google AppsScripts. Think of it as the Advanced Services with Batch Superpowers.

More technically, this library can be used to send http requests via `UrlFetchApp.fetch` or `UrlFetchApp.fetchAll`, interacting with api endpoints in raw form. By bringing it down to a lowest layer on this platform, you get the following benefits:

- All of the options, features, and abilities that are available. No compromises.
- Ability to batch the requests in bulk. Performance can be signficantly improved and run times lowered.

If you're looking for a way to duck under the `6` minute limit to your scripts, the last bullet point should be particularly interesting.

Trade-offs:

- You have to use the "reference documentation" (of Google or otherwise) in order to use it effectively

However:

- If you're using Google APIs, it uses the discovery service to make this easier; all you need to know is the service `name`, `version`, `resource`, and `method`


## Quickstart

### Add as library

Install by adding this library to your project:

- Library ID: `1WovLPVqVjZxkxkgCNgI3S_A3eDsX3DWOAoetZgRGW1JpGQ_9TK25y7mB`

### Use direct methods 

You can use a more direct methods that match the http verbs ("get", "post", etc) to build http requests:

```js
// make a get request to https://example.com?s=searchstring:
const json = Endpoints.get('https://example.com', {
  query: {
    s: 'searchstring'
  }
});

// make an authenticated post request with headers and payload
const json = Endpoints.post('https://example.com', {
  payload: {
    key: 'value'
  },
  headers: {
    'Authorization': 'Basic ' + token;
  }
});
```

### Use objects

```js
// creates endpoint with automatic oauth authentication
// same as the spreadsheets advanced service Spreadsheets.Values
const endpoint = Endpoints.createGoogEndpoint('sheets', 'v4', 'spreadsheet.values', 'get');

// now create a Request object, sending <id> for the path parameter 
const request = endpoint.httpget({spreadsheetId: '<id>'});

// the Request object has fetch method
const response = request.fetch();

// the Response object has json property
response.json;
```

Why objects? More flexibility. Apply different query parameters depending on a condition:

```js
const request = Endpoints.createRequest('get', 'https://example.com');
if (condition)
  request.addQuery({s: 'searchstring'});
else
  request.addQuery({p: 'something else'});
```

Or really get into the weeds. Looking at [reference documentation](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update) of how to update values on a Google spreadsheet, we can derive this:

```js
// Note, 
const request = Endpoints.createRequest('put', {
  url: 'https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}',
  spreadsheetId: '<id>',
  range: '<range>'
}, {
  query: {
    valueInputOption, 'USER_ENTERED'
  },
  headers: {
    Authorization: "Bearer " + ScriptApp.getOauthToken()
  },
  payload: {
    'values': [
      [1, 2, 3]
    ]
  }
});


const json = request.fetch().json;
```

## Tutorial

### Download from Wikipedia

Wikipedia offers a great API to get us started learning how to use this library to make simple requests. We can use the documentation. Let's start out by using `.createRequest` method on the library:

```js
const url = 'https://test.wikipedia.org/w/api.php';
const request = Endpoints.createRequest('get', {url});
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

```js
const endpoint = Endpoints.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');  
```

Under the hood, this `createGoogEndpoint` uses the [Discovery Services API](https://developers.google.com/discovery) to build the endpoint object.

In this case, we are interacting with the `"sheets"` service, version `"v4"`, in the resource `"spreadsheets.values"` and the `"update"` method, which is the target endpoint that Google exposes for updating spreadsheets that we have in mind. We need to create a http `put` request with that endpoint. Documentation for this is [here](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update).

Now that we have an endpoint object, by looking through the `Endpoints` namespace, we find that `httpput` method which will allow us to prepare the request object:

```js
const request = endpoint.httpput(
  {    /* path parameters */		
    spreadsheetId: '<id>',
    range: 'Sheet1!A1'
  },{  /* request body */
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

const response = request.fetch();
Logger.log(response.json);  // got data
```

So the general sequence in this library is that you make an `Endpoint` instance, then on that use a method that starts with `http` to get a  `Request` instance, call `.fetch` on that to get a `Response` object, and call `json` on that to get the raw data back.

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

  batch.add({request: request});

});
    
const responses = batch.fetchAll();
for (const response of responses) {
  Logger.log(response.json);
}
```

You don't have to use the batch functions to create requests to the same endpoint. Any request that you can create with this library can be processed in batch mode, as long as the `request` parameter to `add` is a `Request` object.

When working in batch mode, it's most convenient to add properties to the individual requests. Adding requests supports the very last parameter being an objects, whose keys are added to the request object.

```js
const batch = Endpoints.batch();
// we want to keep name on the request object itself:
const items = [{id: '<id1>', name: 'a'}, {id: '<id2>', name: 'b'}];
    
ids.forEach([id, name] => {
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
  }, {  // last parameter
    name  // <— it'll be on the request object
  });

  batch.add({request: request});
});

batch.fetchAll().forEach(request => {
  Logger.log(request.name);  // name is here
});
```

### Batch mode: Bring on the heavy

Above, we see that this library allows the developer to create request objects that interact with APIs. You can make two calls at once. But what about if you have lots of API calls to make, like 1000s of them? Maybe you want all your students from an SIS on a google spreadsheet, or maybe you want to get a bunch of calendar event info for an event.

If you were to do this with `UrlFetchApp.fetch` you'll probably run out of execution time. That's why batch mode is so useful, as you get into the fast territory.

However, when you get to be that efficient, API endpoints always have rate limitations that a program needs to respect. You get a `429` error when you've gone too fast, and then you have to wait until you can try again. (It's annoying but necessary to ensure scalability.) That's a pain to program, but this library abstract that away from you … with an iterator!

Look how easy it is to go through 1000s of API calls:

Suppose that your API for news articles has an `id` for the path parameter, and you want to get the first 1000 articles. Let's build it:

```js
const batch = Endpoints.batch(50);   // 50 is default 
for (let id= 1; id <= 1000; id++) {
  const request = Endpoints.createRequest('get', {id});
  batch.add({request});
}
```

At this point, if you were to just do `batch.fetchAll()` it would attempt to download all 1000 articles, and wouldn't give up until it was done. Then you could do what you needed with those articles.

Instead, let's download them in chunks, passing time back to you every now and again, so that you can do the necessary processing. Then it can try and get the next chunk for you. That way, it's easier for the library to juggle the huge number of requests as it's inserting a nice breathing space for the rate limitation to "reset."

We can do that with an **iterator**!

```js

for (const response of batch) {
  Logger.log(response.json);
}
```

The above is a bit magical and doesn't show you all the stuff happening underneath, but it's actually calling `fetchAll` for articles `50` at a time (the default rate limit, but you can set it higher), and then spits them out to you one at a time.

That's it!

>While this iterator pattern does its best not to cross the passed-in rate limitation, if a rate limit is encountered anyway, it is also handled for you. First it pauses for as long as the response code tells it to, and then does a manual round trip, returning that response.

## Notes on `createGoogEndpoint`

This method accepts four parameters `name`, `version`, `resource` and `method`, and these four have to match how the Discovery Service is structured and kept. The best way to get the real values that are really needed (for now?) is to go to this [try API page](https://developers.google.com/discovery/v1/reference/apis/list) and try to work out the exact terminology for the four parameters.

### Reference for commonly-used discovery documents

Finding these names can be tricky, which is why this table can be helpful:

| Common Name | name, version | Documentation Link |
| :---         |     :---:      |          ---: |
| Admin Directory   | "admin", "directory_v1"     | [link](https://developers.google.com/admin-sdk/directory/reference/rest)    |
| Admin Reports   | "admin", "reports_v1"     | [link](https://developers.google.com/admin-sdk/directory/reference/rest)    |
| Sheets     | "sheets", "v4"       | [link](https://developers.google.com/sheets/api/reference/rest)      |

If you, like me, have to spend a few minutes finding them, add a pull request and I'll add it to the table.

### Recipes

Code using endpoints for Oauth2 flow:

```js
const subdomain = '';
const domain = '';
const path = '';  

const Module = Endpoints.module();
const base = `https://${subdomain}.${domain}/`;
const oauth = new module({
  baseUrl: base + "${stub}",
});

// This will output all the initialization call happening, useful for troubleshooting
oauth.setVerbosity(3);

const oauthEndpoint = oauth.createRequest(
  "POST",
  {
    stub: "oauth/token", // the token generation endpoint (different depending)
  },
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Utilities.base64Encode(clientId + ":" + clientSecret),
    },
    payload: {
      grant_type: "client_credentials",
    },
  }
);

const resp = oauthEndpoint.fetch();
if (!resp.ok) throw new Error(resp.text);

json = resp.json;

const token = json.access_token;
const base = `https://${subdomain}.${domain}/${path}/`;
const endpoint = new Module(
  {
    baseUrl: base + "${stub}",
  },
  {
    stickyHeaders: {
      Authorization: `Bearer ${token}`,  // Will keep auth token on each call
    },
    stickyQuery: {
      count,
    },
  }
);

// 
endpoint.setVerbosity(3);

// use it:

const request = endpoint.createRequest({
  stub: "students"
}, {
  query: {
    page: 1,
  }
});

const response = request.fetch();
const json = response.json;

...

```

## To import as an npm module:

`npm install @classroomtechtools/endpoints`

The above will also install the following dependencies:

- @classroomtechtools/unittesting
- @classroomtechtools/enforce_arguments

## Unit tests

This library was built with unit tests, both locally and in the AppsScripts context.

```js
interacting incorrectly with endpoint that produces 404
  ✔ json instead contains error object with message and information

using batch mode to mirror spreadsheet writes
  ✔ responses has length of 2

using service account to create
  ✔ Spaces available

http get requests to sheets v4 service, expected to fail
  ✔ Endpoint#baseUrl returns templated string of endpoint
  ✔ Request#getUrl returns url based on substitutions within baseUrl
  ✔ Response#isOk indicates unsuccessful request
  ✔ Response#statusCode indicates 403 error (permission denied)
  ✔ Response#headers returns headers with Content-Type 'application/json; charset=UTF-8'
  ✔ Response#json returns json with error.status set to 'PERMISSION_DENIED'
  ✔ Response#response returns the original request
  ✔ Request#headers returns Authorization: Bearer

http get request with no authentication
  ✔ internally, Request#query object starts with empty object
  ✔ internally, Request#url is same as original passed
  ✔ Request#addQuery appends query parameters to returned url
  ✔ Request#addQuery appends query parameters to url, keeping old values
  ✔ Response#ok returns true on success
  ✔ Response#json returns parsed json
  ✔ Response#statusCode returns 200 on success
```
