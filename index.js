const { StreamClient } = require("cw-sdk-node");
const https = require('https');
var Heap = require("collections/heap");

//List of profitable exchanges of currencies 
var arbitrage_values = [];

//On market update, store prices of changed values
var prices = [];

//Before connection, store names of all assets
var assets = [];

//Before connection, store market values
//This helps determine the pair name after market update. 
var markets = {};


//Adding all exchanges would be expensive, plus we can
//add our own custom maker and taker fees. 
var exchanges = {};
exchanges[1] = {
    "exchange": "bitfinex",
    "maker_fee": .10,
    "taker_fee": .20
};
exchanges[3] = {
    "exchange": "bitstamp",
    "maker_fee": .50,
    "taker_fee": .50
};
exchanges[4] = {
    "exchange": "kraken",
    "maker_fee": .14,
    "taker_fee": .24
};
exchanges[8] = {
    "exchange": "gemini",
    "maker_fee": .50,
    "taker_fee": .50
};
exchanges[14] = {
    "exchange": "bitvc",
    "maker_fee": .20,
    "taker_fee": .20
};
exchanges[21] = {
    "exchange": "poloniex",
    "maker_fee": .08,
    "taker_fee": .20
};
exchanges[25] = {
    "exchange": "bittrex",
    "maker_fee": .25,
    "taker_fee": .25
};
exchanges[28] = {
    "exchange": "bitbay",
    "maker_fee": .25,
    "taker_fee": .36
};
exchanges[63] = {
    "exchange": "hitbtc",
    "maker_fee": .10,
    "taker_fee": .10
};
exchanges[65] = {
    "exchange": "bitz",
    "maker_fee": .10,
    "taker_fee": .10
};



const client = new StreamClient({
    creds: {
        apiKey: "", // your cw api key
        secretKey: "" // your cw secret key
    },
    subscriptions: [
        "exchanges:4:trades", //Kraken exchanges
        "exchanges:25:trades", //Bittrex exchanges
        "exchanges:63:trades", //hitbtc exchanges
        "exchanges:21:trades", //Poloniex exchanges
        "exchanges:65:trades", //Bitz exchanges
        "exchanges:28:trades", //Bitbay exchanges
        "exchanges:3:trades", //Bitstamp exchanges
        "exchanges:14:trades", //Bitvc exchanges
        "exchanges:8:trades", //Gemini exchanges
        "exchanges:1:trades" //Bitfinex exchanges
    ],
    logLevel: "debug"
});

// Handlers for market and pair data
client.onMarketUpdate(marketData => {
    
    //First obtain market and exchange variables
    var market_exchange_id = marketData["market"]["exchangeID"];

    var pairID = marketData["market"]["currencyPairID"];

    var exchange_data = exchanges[market_exchange_id];
    var exchange_name = exchange_data["exchange"];

    var market_data = markets[exchange_name];
    
    //After finding the market id, iterate the market data for a pair match. 
    var pairName = '';

    try {
        for(var i = 0; i < market_data.length; i++){
            if(market_data[i]["id"] == pairID){
                pairName = market_data[i]["pair"];
                break;
            }
        }
    }
    catch(error) {}


    //Now, iterate the assets to determine the prefix of the pair name.
    //I.E, btc is the prefix of btcusd. 
    //This helps us compare currency triangulation. 
    var pairPrefix = '';

    if(pairName != ''){
        for(var j = 0; j < pairName.length; j++){
            var temp = pairName.substring(0, j);
            if(assets.includes(temp)){
                pairPrefix = temp; //
                break;
            }
        }

        if(pairPrefix !== ''){
            for(var i in exchanges){

                var exchange_json = exchanges[i];

                var market_data = markets[exchange_json["exchange"]];

                for(var k = 0; k < market_data.length; k++){

                    var pair = market_data[k]["pair"];

                    //When the pair is found, 
                    if(pair.includes(pairPrefix)){
                        let base_price_string = "https://api.cryptowat.ch/markets/";
                        base_price_string += exchange_json["exchange"] + "/";
                        base_price_string += market_data[k]["pair"];
                        base_price_string += "/price";



                        callback = function(response) {

                            let str = '';
                            response.on('data', function (chunk) {
                                str += chunk;
                            });

                            response.on('end', function () {
                                var price = JSON.parse(str);
                                price = String(price["result"]["price"]);     //Will otherwise round small vals to 0.
                                if(price > 0) {
                                    //Index by values for easy lookup. 
                                    prices[pairPrefix + ":-" + pair + ":-" + market_exchange_id] = price;
                                };


                            });
                        };

                        var req = https.get(base_price_string, callback).end();
                        break;
                    }
                }

            }
            //Now that the price is added to the hash array, 
            calculateArbitrage();
        }
    }

});


client.onPairUpdate(pairData => {
    //console.log(pairData);
});


// Error handling
client.onError(err => {
    console.error(err);
});

// You can also listen on state changes
client.onStateChange(newState => {
    console.log("connection state changed:", newState);
});

client.onConnect(() => {
    console.info("streaming data for the next 5 minutes...");
    setTimeout(() => {
        client.disconnect();
    }, 400 * 1000);


});

client.onDisconnect(() => {
    console.log("done");
});




async function calculateArbitrage(){

    //Todo: Note, sorry, we wanted to do a pass over
    //Todo: the existing price data for all values but
    //Todo: it severely limits the amount of cpu time we are
    //Todo: able to use, plus we were limited on time.

    //Todo: NOTE: Occasionally, an error will pop up
    //Todo: due to having a cap on CPU time while using
    //Todo: marketwat.ch APIs. We assure you that the
    //Todo: correct arbitrage values are still calculated
    //Todo: and displayed.
    
    //Todo: Finally, the first few iterations will appear empty.
    //Todo: It simply needs a little more time. 

    var visited = {}
    var array = [];
    var arr_2 = [];

    var queue_changed = false;

    for(var price in prices){
        for(var compare in prices){
            var price_tokens = price.split(":-");
            var compare_tokens = compare.split(":-");
            //Sample token: prefix :- pairname :- exchange_id
            //              btc:-btcusd:-4 (<-Kraken)
            //Ensure elements aren't the same
            if(price !== compare && visited[price_tokens[1] + compare_tokens[1]] !== true){
                //TODO: Uknown exchange rates between tokens (I.e, USD to EUR).
                if(price_tokens[1] === compare_tokens[1]){
                    var difference = prices[price] - prices[compare];
                    if(difference > 0 && exchanges[price_tokens[2]]["exchange"] != exchanges[compare_tokens[2]]["exchange"]){
                        visited[price_tokens[1] + compare_tokens[1]] = true;
                        var taker_fee = exchanges[compare_tokens[2]]["taker_fee"];
                        var arbitrage = difference - (difference * taker_fee);
                        var name_header = price_tokens[0] + ": " +
                            exchanges[price_tokens[2]]["exchange"] + "=>" + exchanges[compare_tokens[2]]["exchange"];
                        arbitrage_values[name_header] = arbitrage;


                    }

                }

            }

        }
    }

    //TODO: NOTE: Higher arbitrage value = better trade.
    //TODO: NOTE: This won't log any data initially, until
    //TODO: a new price is received from the API
    console.log("\n\n\n\n\n\n\n");
    console.log("~~~~~~~~New Arbitrage Data:~~~~~~~~\n");
    //console.log(arbitrage_values[h]);
    for(var val in arbitrage_values){
        console.log(val + " : " + arbitrage_values[val]);
    }

}



async function getAssetArray(){
    var base_asset_url = "https://api.cryptowat.ch/assets";

    var str = '';

    callback = function(response) {

        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            var json = JSON.parse(str);
            for(var i = 0; i < json["result"].length; i++){
                assets.push(json["result"][i]["symbol"]);
            }
            return;

        });
    }

    var req = https.get(base_asset_url, callback).end();

}

async function getMarketArray(exchange_name){
    var base_market_url = "https://api.cryptowat.ch/markets/" + exchange_name;

    var str = '';

    callback = function(response) {

        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            var parsed_str = JSON.parse(str);
            var new_json = [];
            for(var i = 0; i < parsed_str["result"].length; i++){
                if(parsed_str["result"][i]["active"] === true){
                    new_json.push(parsed_str["result"][i]);
                }
            }
            markets[exchange_name] = new_json;
            //console.log(markets);
            return;

        });
    }

    var req = https.get(base_market_url, callback).end();

}


async function startProgram() {
    //Get Asset arraylist
    await getAssetArray();

    //Get exchange arrays
    await getMarketArray("bitfinex");
    await getMarketArray("bitstamp")
    await getMarketArray("kraken");
    await getMarketArray("gemini");
    await getMarketArray("bitvc");
    await getMarketArray("poloniex");
    await getMarketArray("bittrex");
    await getMarketArray("bitbay");
    await getMarketArray("hitbtc");
    await getMarketArray("bitz").then(client.connect());
}

startProgram();
