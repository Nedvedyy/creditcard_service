'use strict';

var utility_nodejs = require('utility_nodejs');

module.exports.hello = (event, context, callback) => {
  //console.log('hello'.green); // outputs green text
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
      testpackage: utility_nodejs.welcome('nedved_testtesttest'),
    }),
  };

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
