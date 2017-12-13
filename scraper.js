/*
  Require modules neccessary for project
  cheerio: loads html and offers jquery syntax-like for dom manipulation
  json2csv: writes a json obj to csv file with explicit row headers
*/
    const fs = require('fs');
    const http = require('http');
    const cheerio = require('cheerio');
    const json2csv = require('json2csv');

/*
Initiate get request with host shirts4mike
*/

  /* use http://www.shirts4mike.com/pants.php to ge the 404 error*/
    const request = http.get('http://www.shirts4mike.com/shirts.php', response => {

        if (response.statusCode === 200) {
            let body = '';
            response.on('data', chunk => {
                body += chunk;
            });

            response.on('end', () => {
                const tshirtObj = [];
                getLinks(body, tshirtObj);
            });
          }
          /*
            If 404 error or any other response error create err object
          */
          else {
              let err = new Error();
              err.name = 'Scraper-Error: No page to scrape';
              err.message = `There was a(n) ${response.statusCode} error while retrieving host site`;
              console.log(`${err.name}: ${err.message}`);
              printErrorMsg(err);
          }
    });
/*
  If request generates error - no internet connection log error message
*/
      request.on('error', function(err) {
          let err1 = new Error();
          err1.name = 'Scraper-Error: No page to scrape';
          err1.message = `There was no response from ${err.hostname} or you do not have an active internet connection`;
          console.log(`${err1.name}: ${err1.message}`);
          printErrorMsg(err1);
        });

/*
Construct error message with json datetime stamp and error message
*/
function printErrorMsg(error) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const date = new Date();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const day = date.getUTCDate();
    const wkday = date.getDay();
    const hr = date.getUTCHours();
    const min = date.getUTCMinutes();
    const sec = date.getUTCSeconds();
    const msg = (`[${days[wkday]} ${months[month]} ${day} ${year} ${hr}-${min}:${sec}(UTC)] ${error.name}.${error.message}\n`);
    logError(msg);
}

/*
Log error message to external log file
*/
function logError(msg) {
    fs.appendFile('scraper-error.log', msg, function (err) {
        if (err) throw err;
    });
}


/*
Scrape the URI links from the hostname to visit each page and get detailed data
*/
function getLinks(html,tshirtObj){
    const $ = cheerio.load(html);
    const $links = $('.products li a');
    const tshirtLinks = [];

    $($links).each(function (i,elem) {
        tshirtLinks.push($(this).attr('href'));
    });
    pageScrape(tshirtLinks,tshirtObj);
}

/*
Call each URL contructed from the getLinks array to begin scraping
*/
function pageScrape(tshirtLinks,tshirtObj) {
    tshirtLinks.forEach(function(element) {
        const request = http.get(`http://www.shirts4mike.com/${element}`, response => {
                let body = '';
                response.on('data', chunk => {
                    body += chunk;
                });

                response.on('end', () => {
                    pageScrapeData(body,tshirtObj,element);
                });
        });
    });
    /*
    Give a second to populate the tshirtjson object before converting to csv
    */
    setTimeout(function() {
        convertToCSV(tshirtObj);
    }, 1000);
}

/*
Convert json object from scraping to a csv format and write to external file
*/
function convertToCSV(tshirtObj){
    const fields = ['title', 'price', 'imageUrl','url','time'];
    const csv = json2csv({ data: tshirtObj, fields: fields });
    const date = new Date();
    const month = date.getUTCMonth()+1;
    const year = date.getUTCFullYear();
    const day = date.getUTCDate();
    const tshirtJSON = JSON.stringify(tshirtObj);
        if ((!fs.existsSync('./data/'))) {
            fs.mkdirSync('./data/');
        }
    fs.writeFileSync(`./data/${year}-${month}-${day}.csv`,csv);
}

/*
Scrape relevent data from the fields variable in convertToCSV function and append to tshirtObj
*/
function pageScrapeData(html,tshirtObj,element) {
    const $ = cheerio.load(html);
    let title = $('.shirt-details h1').text();
    title =  title.substring(4);
    let price = $('.shirt-details h1').text();
    let imageUrl = $('.shirt-picture img').attr('src');
    price = price.substring(0,4);
    let time = new Date();
    var jsonDate = time.toJSON();
    tshirtObj.push({
        "title": title,
        "price": price,
        "imageUrl": `http://www.shirts4mike.com/${imageUrl}`,
        "url":`http://www.shirts4mike.com/${element}`,
        "time": jsonDate
    });
}
