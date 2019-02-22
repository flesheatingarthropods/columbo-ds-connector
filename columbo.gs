/**
 *  Common variables
 *
 */


connector = {
  "baseurl":"https://api.columbo.io/accounts",
  "staticUrl":"https://static.columbo.io",
  "userNameKey":"dscc.username",
  "tokenKey":"dscc.token",
};


/**
 *  Authentication
 *
 * Access to the Columbo.io API is controlled via email plus a user specific key, so presumably
 * we need to use "USER_TOKEN" as authentication method
 * and implement a setCredentials method accordingly.
 *
 * The SetCredentials method should call a "checkForValidCreds" method.
 *
 * Calling the endpoint with a wrong token will return a JSON object with this error message:
 *
 * {
 *  "success": false,
 *  "error": "invalidPassword",
 *  "errors": ["invalidPassword"]
 * }
 * Calling the endpoint with a wrong email address, or both wrong email and token, will return a JSON object with this error message:
 *
 * {
 *  "success": false,
 *  "error": "invalidEmail",
 *  "errors": ["invalidEmail"]
 * }
 *
 * So we can check for the value of the success key. We do not need be interested in the specific error.
 *
 */

/**
 * Gets the Auth type.
 * @return {object} The Auth type.
 */
function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse()
      .setAuthType(cc.AuthType.USER_TOKEN)
      .build();
}

/**
 * Resets the auth service. Values have been set in @setCredentials
 */
function resetAuth() {
  var user_tokenProperties = PropertiesService.getUserProperties();
  user_tokenProperties.deleteProperty(connector.userNameKey);
  user_tokenProperties.deleteProperty(connector.tokenKey);
}


/**
 * Returns true if the auth service has access.
 * @return {boolean} True if the auth service has access.
 */
function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var userName = userProperties.getProperty(connector.userNameKey);
  var token = userProperties.getProperty(connector.tokenKey);
  // This assumes you have a validateCredentials function that
  // can validate if the userName and token are correct.
  return validateCredentials(userName, token);
}


/**
 * Returns true if credentials are valid
 * @return {boolean} True if credentials are valid .
 *
 * TODO implement check
 */

function validateCredentials(userName, token) {

if (userName === null || token === null) {
    return false;
  }
 return true;
}


/**
 * Sets the credentials.
 * @param {Request} request The set credentials request.
 * @return {object} An object with an errorCode.
 */
function setCredentials(request) {
  var creds = request.userToken;
  var userName = creds.username;
  var token = creds.token;

  // Optional
  // Check if the provided username and token are valid through a
  // call to your service. You would have to have a `checkForValidCreds`
  // function defined for this to work.
  var validCreds = validateCredentials(userName, token);
  if (!validCreds) {
    return {
      errorCode: 'INVALID_CREDENTIALS'
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(connector.userNameKey, userName);
  userProperties.setProperty(connector.tokenKey, token);
  return {
    errorCode: 'NONE'
  };
}

function isAdminUser() {
  return true;
}


/**
 * Configuration
 *
 * There are at least two configuration options that need to be set, account and report type.
 *
 * The account id is a string that will be added to the API endpoint url.
 *
 * The report type is one of audit summary, scenario summary or test summary.
 *
 * However in our first attempt we will only support the audit summary, so we won't yet
 * have to deal with subconnectors.
 *
 * When we add support for the other report types, the github open source connector is
 * a good ressource to see how this might be implemented:
 * https://github.com/googledatastudio/community-connectors/blob/master/github/main.js
 *
 */


/**
 * Builds the Community Connector config.
 * @return {Config} The Community Connector config.
 * @see https://developers.google.com/apps-script/reference/data-studio/config
 */

function getConfig() {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
      .setId('instructions')
      .setText('Enter account id and report type.');

  config.newTextInput()
      .setId('account')
      .setName('Enter the account id for your Columbo account.')
      .setHelpText('You find this in the url https://app.columbo.io/accounts/<columbo.io account id>/')
      .setPlaceholder('accountid')
      .setAllowOverride(true);

  config.newSelectSingle()
      .setId('reportType')
      .setName('Select a report type')
      .setHelpText('Currently only audits summarys are supported')
      .setAllowOverride(true)
      .addOption(config.newOptionBuilder().setLabel('Audit Summary').setValue('audit'))
      .addOption(config.newOptionBuilder().setLabel('Test Summary').setValue('test'))
      .addOption(config.newOptionBuilder().setLabel('Scenario Summary').setValue('scenario'));

  return config.build();
}



/**
 * Schema
 *
 * For the first attempt we want to retrieve the following fields from the
 * audit summary page
 *
 * name *
 * lastSweepAt *
 * active *
 * summaryUpdatedAt
 * screenshot.filename
 * screenshot.directory
 * screenshot.format
 * screenshot.takenAt
 * summary.pages.scanned *
 * summary.pages.found *
 * summary.toolCoverage
 *
 */


/**
 * Builds the Community Connector fields object.
 * @return {Fields} The Community Connector fields.
 * @see https://developers.google.com/apps-script/reference/data-studio/fields
 */
function getFields() {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields.newDimension()
      .setId('audit_name')
      .setName('Audit Name')
      .setType(types.TEXT);

  fields.newDimension()
    .setId('last_sweep_at')
    .setName('Last sweep at')
    .setDescription('The date the current audit started')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Date');

  fields.newDimension()
      .setId('active')
      .setName('active')
      .setType(types.TEXT);


  fields.newDimension()
      .setId('screenshot')
      .setName('Screenshot Url')
      .setType(types.TEXT);

  fields.newMetric()
      .setId('pages_scanned')
      .setName('Pages Scanned')
      .setType(types.NUMBER);

  fields.newMetric()
      .setId('pages_found')
      .setName('Pages Found')
      .setType(types.NUMBER);

  return fields;
}

/**
 * Builds the Community Connector schema.
 * @param {object} request The request.
 * @return {object} The schema.
 */
function getSchema(request) {
  var fields = getFields().build();
  return {'schema': fields};
}

/**
 * Get Data
 *
 * functions to retrieve the data and map it to the schema
 *
 *
 */


/**
 * Constructs an object with values as rows.
 * @param {Fields} requestedFields The requested fields.
 * @param {object[]} response The response.
 * @param {string} packageName The package name.
 * @return {object} An object containing rows with values.
 */
function responseToRows(requestedFields, response) {


  // Transform parsed data and filter for requested fields
  return response.map(function(audit) {

    var row = [];
    requestedFields.asArray().forEach(function(field) {
      switch (field.getId()) {
        case 'audit_name':
          return row.push(audit.name.replace(/-/g, ''));
        case 'last_sweep_at':
          return row.push(audit.lastSweepAt);
        case 'pages_scanned':
          return row.push(audit.summary.pages.scanned);
        case 'screenshot':
          return row.push([connector.staticUrl,audit.screenshot.directory,audit.screenshot.filename].join("/"));
        case 'pages_found':
          return row.push(audit.summary.pages.found);
        default:
          return row.push('');
      }
    });
    return {values: row};
  });
}

/**
 * Gets the data for the community connector
 * @param {object} request The request.
 * @return {object} The data.
 */
function getData(request) {

  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);

  var userProperties = PropertiesService.getUserProperties();
  var user = userProperties.getProperty(connector.userNameKey);
  var token = userProperties.getProperty(connector.tokenKey);
  var options = {};
  options.headers = {"Authorization": "Basic " + Utilities.base64Encode(user + ":" + token)};


  // Fetch and parse data from API
  var url = [
    connector.baseurl,
    "/",
    request.configParams.account,
    '/audits'
  ];
  var response = UrlFetchApp.fetch(url.join(''),options);
  parsedResponse = JSON.parse(response);

  try {
   var rows = responseToRows(requestedFields, parsedResponse);
  } catch (e) {
    DataStudioApp.createCommunityConnector()
      .newUserError()
      .setDebugText('Error fetching data from API. Exception details: ' + e)
      .setText('There was an error communicating with the service. Try again later, or file an issue if this error persists.')
      .throwException();
  }

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}
