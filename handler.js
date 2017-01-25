'use strict';
//git ignore
var mysql       = require('mysql');
var AWS = require('aws-sdk');
AWS.config.update({region:'ap-southeast-1'});
var Memcached = require('memcached');
var elasticache = new AWS.ElastiCache();
var params = {
};

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

console.log('Inside of 1creditcard_service lambda');


module.exports.serviceUpdate = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log('service update:');
    console.log(event);
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'serviceUpdated.',
            input: event,
        }),
    };
    callback(null, response);
};

module.exports.hello = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    var memcached = new Memcached('creditcard-memcache.fr4b8j.cfg.apse1.cache.amazonaws.com:11211',
        {
            timeout: 2000,
            retries: 1,
            retry:30000

        });
    memcached.on("reconnecting", function () {
        console.log('reconnecting');
        //throw err
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Reconnecting.',
                input: event,
            }),
        };
        callback(null, response);
    } );
    memcached.on("failure", function () {
        console.log('failure');
        //throw err
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Failure...',
                input: event,
            }),
        };
        callback(null, response);
    } );
    memcached.on("reconnect", function () {
        console.log('reconnect');
        //throw err
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'reconnect',
                input: event,
            }),
        };
        callback(null, response);
    });
    /*
    memcached.set( "hello", 1, 1000, function( err, result ){
        if( err )
            console.log( err );

        console.log( result );
        memcached.end();
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: result,
                input: event,
            }),
        };
        callback(null, response);
    });*/
    memcached.get('hello', function (err, data) {
        console.log('data:');
        console.log(data);
        memcached.end();
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: data,
                input: event,
            }),
        };
        callback(null, response);
    });
};


// curl --request GET 'http://localhost:3000/creditcardservice/deals?lat=1.277761&lng=103.844438'

module.exports.getDeals = (event, context, callback) => {
    console.log('*********************************');
    console.log('API: GET /deals');
    context.callbackWaitsForEmptyEventLoop = false;
    console.log(event.queryStringParameters);
    var lat       = '';
    if(event.queryStringParameters.lat)
        lat  = event.queryStringParameters.lat; // test value: 1.276595
    var lng       = '';
        lng = event.queryStringParameters.lng; // test value: 103.844091
    console.log('lat:'+lat);
    console.log('lng:'+lng);
    var queryString = 'select dealItemId, dealDescription, dealImgLink,dealTerms,dealURL,dealExcerpt,dealStart,dealEnd, ' +
        'shopLat, shopLng, shopName, shopContact,shopAddress,shopPostal,shopMemberType, shopURL, ' +
        'typeName,typeValue,typeDisplayName, ' +
        'genreName,genreDescription,genreDisplayName ' +
        'from TBL_DEALS ' +
        'left join TBL_SHOPS ON TBL_SHOPS.shopId= (SELECT shopId FROM TBL_DEALS,TBL_DEALSHOP WHERE TBL_DEALS.dealItemId = TBL_DEALSHOP.dealId ) ' +
        'left join TBL_GENRES ON TBL_GENRES.genreId = (SELECT genreId FROM TBL_DEALS,TBL_DEALGENRE WHERE TBL_DEALS.dealItemId = TBL_DEALGENRE.dealId ) ' +
        'left join TBL_TYPES ON TBL_TYPES.typeId = (SELECT typeId FROM TBL_DEALS,TBL_DEALTYPE WHERE TBL_DEALS.dealItemId = TBL_DEALTYPE.dealId ) ' +
        'WHERE TBL_DEALS.dealStatus = "Y" AND TBL_DEALS.dealEnd >= CURDATE() AND TBL_GENRES.status = "Y" AND TBL_TYPES.status = "Y"';
    pool.getConnection(function(err, connection) {
        console.log('err:');
        console.log(err);
        console.log(connection);
        connection.query( queryString, function(err, rows) {
            console.log('connection query returns:');
            console.log('err:');
            console.log(err);
            console.log(rows);
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
                    if(lat.length>0 && lng.length>0){
                        console.time('Sorting deals with lat/lng');
                        dealsJson.sort(function(a, b) {
                            a.distance = getDistanceFromLatLonInKm(a.shopLat,a.shopLng,lat,lng);
                            b.distance = getDistanceFromLatLonInKm(b.shopLat,b.shopLng,lat,lng);
                            return a.distance - b.distance;
                        });
                        console.timeEnd('Sorting deals with lat/lng')
                    }else{
                        console.log('Either Lat/Lng not available');
                    };
                    //wirte to Memcached.

                    const response = {
                        statusCode: 200,
                        body: JSON.stringify({
                            message: 'Data returned',
                            input: event,
                            data: dealsJson
                        }),
                    };
                    console.log('response:');
                    console.log(response);
                    callback(null, response);
                    //context.succeed(response)
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
/*
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
};*/

// =============================================================================
// load Json Data
/* Read Synchrously
console.time('loading sample JSON');
var loadingStartTime = new Date();
dealsJson = JSON.parse(fs.readFileSync('1000Records.json', 'utf8'));
console.timeEnd('loading sample JSON');
*/
