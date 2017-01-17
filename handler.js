'use strict';
//git ignore
var mysql       = require('mysql');
var fs = require("fs");
var serverIP    = 'creditcard.cbwiqcucvz8o.ap-southeast-1.rds.amazonaws.com';
var pool  = mysql.createPool({
    host     : serverIP,
    user     : 'admin',
    password : '5257sisi',
    database : 'creditcard',
    port     : '3306'
});

// global variables.
var dealsJson ;

//common functions

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1);
    var a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180)
}

console.log('Inside of creditcard_service lambda');

module.exports.hello = (event, context, callback) => {
  //console.log('hello'.green); // outputs green text
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};


//  post test: curl --data "param1=value1&param2=value2" http://localhost:3000/creditcardservice/deals

module.exports.generateDeals = (event, context, callback) => {
    console.log('*********************************');
    console.log('API: /gen_deals');
    console.log(JSON.parse(event.body));
    var queryString = 'select dealItemId, dealDescription, dealImgLink,dealTerms,dealURL,dealExcerpt,dealStart,dealEnd, ' +
        'shopLat, shopLng, shopName, shopContact,shopAddress,shopPostal,shopMemberType, shopURL, ' +
        'typeName,typeValue,typeDisplayName, ' +
        'genreName,genreDescription,genreDisplayName ' +
        'from TBL_DEALS ' +
        'left join TBL_SHOPS ON TBL_SHOPS.shopId= (SELECT shopId FROM TBL_DEALS,TBL_DEALSHOP WHERE TBL_DEALS.dealItemId = TBL_DEALSHOP.dealId ) ' +
        'left join TBL_GENRES ON TBL_GENRES.genreId = (SELECT genreId FROM TBL_DEALS,TBL_DEALGENRE WHERE TBL_DEALS.dealItemId = TBL_DEALGENRE.dealId ) ' +
        'left join TBL_TYPES ON TBL_TYPES.typeId = (SELECT typeId FROM TBL_DEALS,TBL_DEALTYPE WHERE TBL_DEALS.dealItemId = TBL_DEALTYPE.dealId ) ' +
        'WHERE TBL_DEALS.dealStatus = "Y" AND TBL_DEALS.dealEnd >= CURDATE() AND TBL_GENRES.status = "Y" AND TBL_TYPES.status = "Y"';
    //console.log('queryString:');
    //console.log(queryString);
    pool.getConnection(function(err, connection) {
        connection.query( queryString, function(err, rows) {
            // And done with the connection.
            connection.release();
            if (err)
            {
                //throw err
                const response = {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Errors in /gen_deals:'+err,
                        input: event,
                    }),
                };
                callback(null, response);
            }
            else
            {
                if (rows.length > 0)
                {
                    dealsJson = rows;
                    const response = {
                        statusCode: 200,
                        body: JSON.stringify({
                            message: 'Data returned',
                            input: event,
                            data: dealsJson
                        }),
                    };
                    callback(null, response);
                }else{
                    const response = {
                        statusCode: 200,
                        body: JSON.stringify({
                            message: 'no data returned',
                            input: event,
                        }),
                    };
                    callback(null, response);
                }
            }
        });
    });
};

// curl --request GET 'http://localhost:3000/creditcardservice/deals?lat=1.277761&lng=103.844438'

module.exports.getDeals = (event, context, callback) => {
    console.log('*********************************');
    console.log('HTTP GET:/deals:');
    console.log(event.queryStringParameters);
    var lat       = event.queryStringParameters.lat; // test value: 1.276595
    var lng       = event.queryStringParameters.lng; // test value: 103.844091
    console.log('lat:'+lat);
    console.log('lng:'+lng);
    //sorting
    console.time('filter sorting deals');
    dealsJson.sort(function(a, b) {
        a.distance = getDistanceFromLatLonInKm(a.shopLat,a.shopLng,lat,lng);
        b.distance = getDistanceFromLatLonInKm(b.shopLat,b.shopLng,lat,lng);
        return a.distance - b.distance;
    });
    console.timeEnd('filter sorting deals');
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Data returned',
            input: event,
            data: dealsJson
        }),
    };
    callback(null, response);
};

// =============================================================================
// load Json Data
// Read Synchrously
console.time('loading sample JSON');
var loadingStartTime = new Date();
dealsJson = JSON.parse(fs.readFileSync('1000Records.json', 'utf8'));
console.timeEnd('loading sample JSON');

