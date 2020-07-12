# Endpoints

A library SDK for Google AppsScripts that makes working with public APIs a cinch.

## Quickstart

### To use as a library as an AppsScripts library

Project ID: `MOwaCM3sJzFttpUe7GAFibvD8R0iiSsw_`

### To import as an npm module:

`npm install @classroomtechtools/endpoints`

The above will also install the following dependencies:

- @classroomtechtools/unittesting
- @classroomtechtools/enforce_arguments

## Tour

The library uses namespaces to organize itself:

![The Namespaces](/assets/EndpointsNamespaces.png)

As you can see, there are many methods within the `$` namespace, and they indicate that the are starter methods; you'll need to use these somehow (depending on your use case) to get started with interacting with an API. 

Notice that `$.createGetRequest` returns a `Request` object. So let's see what's available at the `Endpoint.Request` namespace:

![The Namespaces](/assets/EndpointsRequestNamespace.png)

Notice that all of these methods living at this namespace require a `Request` object as the first (or only) parameter? In that way, you can use autocomplete to navigate all the various methods that are available on any object created by the `$` methods.

There is a method `Endpoints.Request.getUrl` method, and so there is also `Request#getUrl`, which means you can do this:

```js
const request = Endpoints.$.createGetRequest(url);
const url1 = request.getUrl();
// or
const url2 = request.url;
Logger.log(url1 === url2);  // true
```

Methods that start with `get` indicate that there is a property on the object which can be immediately accessed.

Curious to read more about what all the various methods actually do? You can read the source code, or you can do so via the online editor with `Endpoints.$.jdoc`:

```js
const doc = Endpoints.$.jdoc(request.getUrl);
Logger.log(doc);
```

outputs:

```
function request_getUrl(request) {
  /**
   * Calculates the url (including any query parameters) sent/will be sent to endpoint on fetch
   * @alias request.getUrl()
   * @alias request.url
   */
```

It explains what the function does, where we learn that it'll return the full url including any query parameters that are on the `Request` object, and also the equivalent methods that live on the object.

## Examples

### Download from Wikipedia

Wikipedia offers a great API to get us started learning how to use this library to make simple requests. 

```js
const wpurl = 'https://test.wikipedia.org/w/api.php';
const request = Endpoints.$.createGetRequest(wpurl);
```

The documentation for this API says we have to provide it some standard query parameters, so that there's an `?action=query` and `&format=json` tacked onto the end of the URL, so let's figure out how to add them.

We have a request object and we explore the `Endpoints.Request` namespace which indicates there is an `addQuery` method. From the tour above, we can see that the `request` variable we created from the `createGetRequest` method has `addQuery` which will take an object:

```js
const query = {action: 'query', format: 'json'};
Endpoints.Request.addQuery(request, query);
// or just
request.addQuery(query);
const url = request.url;
Logger.log(url);  // url includes the query parameters
```

The target API also requires a `titles` query parameter that indicates which article we are after:

```js
request.addQuery({titles: 'Albert_Einstein'});
request.url;  // the full url including query parameters
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

Imagine your application needs to write the exact same information to two different spreadsheet documents. Let's learn how to do that with the batch operations.

We need to create an `Endpoint` object, instead of directly creating a `Request` object as we did before, which will then be used to build the needed `Request` object. First we need to get an endpoint object intended to be used with Google APIs, which we can do via `Endpoints.$.createGoogEndpoint`. Let's learn what it does:

```js
const doc = Endpoints.$.jdoc(Endpoints.$.createGoogEndpoint);
Logger.log(doc);
```

outputs:

```
function $_createGoogEndpoint (name, version, resource, method) {
/**
 * Uses the discovery service to derive the baseUrl for this particular endpoint * Users can become more familiar with possible values by using 
 * https://developers.google.com/discovery/v1/reference/apis/getRest 
 * Note: Any Google service that has a discovery endpoint can use this method to derive endpoint 
 * Note: Oauth authentication is placed in headers via ScriptApp.getOAuthToken() upon request (not upon creation) 
 * @see EndpointsBase_.discovery 
 */
}
```

Very cool. It handles oauth for us by adding headers, and using the discovery service, we see that we can pass the following:

```js
const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');  
```

This refers to the Sheets `"sheets"` service, version `"v4"`, in the resource `"spreadsheets.values"` and the `"update"` method, which is the target endpoint that Google exposes for updating spreadsheets that we have in mind. We need to create a http `put` request with that endpoint. Now that we have an endpoint object, by looking through the `Endpoints.Endpoint` namespace, we find that `Endpoints.Endpoint.httpput` method which will allow us to prepare the request object:

```js
const request = endpoint.httpput(
  {    /* path parameters */		
       spreadsheetId: '<id>',
       range: 'Sheet1!A1'
  },{  /* query parameters */
       valueInputOption: 'RAW'
  },{  /* payload */
       range: 'Sheet1!A1',
       majorDimension: 'ROWS',
       values: [[1]]
  }
);
```

This is all well and good, but that's kind of a lot of work. Let's use the batch functions and see why it might be worth doing that work. Imagine you need to update two different spreadsheets with the exact same info:

```js
const batch = Endpoints.$.initBatch();
const ids = ['<id1>', '<id2>'];
    
ids.forEach(id => {
	const request = endpoint.httpput(
          range: 'Sheet1!A1',
          spreadsheetId: id
        },{
          valueInputOption: 'RAW'
        },{
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: [[1]]
        }
     );
     batch.add(request);
});
    
const responses = batch.fetchAll();
```

You don't have to use the batch functions to create requests to the same endpoint. Any request that you can create with this library can be processed in batch mode.

Or you can build a library that abstracts away all those things for us.
