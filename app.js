var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var request = require('request');
var cors = require('cors');
var parse5 = require('parse5');
var PDFMerge = require('pdf-merge');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();
var merge = require('easy-pdf-merge');



var fs = require('fs'),
  PDFDocument = require('pdfkit'),
  SVGtoPDF = require('svg-to-pdfkit');





const MUSESCORE_URL = 'https://musescore.com/';

const steelAPIRouter =  (req, res) => {
  const targetURL = MUSESCORE_URL + 'user/' + req.params.userId + '/scores/' + req.params.sheetId;
  request(targetURL, function (err, response, body) {


    res.send(body);
  })
};


const steelAPIRouter2 = async (req, res) => {

  // res.send("Please wait for 5 seconds \n" +
  //   "This site is only for communication purpose, documents downloaded may violet copyright regulations, please delete within 24 hours\n" +
  //   "This site is only for communication purpose, documents downloaded may violet copyright regulations, please delete within 24 hours\n" +
  //   "This site is only for communication purpose, documents downloaded may violet copyright regulations, please delete within 24 hours");

  const targetURL = MUSESCORE_URL + 'user/' + req.params.userId + '/scores/' + req.params.sheetId;
  request(targetURL, function (err, response, body) {
    let parsed = parse5.parse(body);

    let svgLink;
    let pageCount;

    // steel the target svg link
    let head = parsed.childNodes[1].childNodes[0].childNodes;
    for (let each of head) {
      if (each.nodeName === "link") {
        for (let eachSub of each.attrs) {
          if (eachSub.name === "href") {
            let list = eachSub.value.split("/");
            let last = list[list.length - 1].split("?")[0];
            if (last === "score_0.svg"){
              svgLink = eachSub.value;
            }
          }
        }
      }
    }

    // get the number of page count
    let tbody = parsed.childNodes[1].childNodes[2].childNodes;
    for (let each of tbody) {
      if (each.nodeName === "div") {
        for (let eachAttr of each.attrs) {
          if (eachAttr.name === "class" && eachAttr.value === "js-store"){
            pageCount = each.attrs[1].value.split("pages_count")[1].split(",")[0].split(":")[1];
          }
        }
      }
    }

    let firstPart = svgLink.split('score_0')[0] + "score_";
    let secondPart = svgLink.split('score_0')[1];

    // generate svg links
    let links = [];
    for (let i = 0; i < pageCount; i++) {
      let tempLink = firstPart + i + secondPart;
      links = [...links, tempLink];
    }

    console.log(links);

    let files = [];

    for (let i = 0; i < links.length; i++) {
      request(links[i], function (err, response, body) {
        var doc = new PDFDocument();
        var stream = fs.createWriteStream('score_'+ i +'.pdf');
        SVGtoPDF(doc, body, 0, 0);
        files = [...files, 'score_'+ i +'.pdf'];

        stream.on('finish', function() {
          console.log('download done with score_'+ i +'.pdf');
        });

        doc.pipe(stream);
        doc.end();
      })
    }



    setTimeout(function () {
      files.sort(function(a, b) {
        return a.split('_')[1].split('.')[0] < b.split('_')[1].split('.')[0]? -1 : 1;
      });
      merge(files, 'merged.pdf', function (err) {
        if(err) {
          return console.log(err)
        }
        console.log('done');
      });



    }, 5000);


    const file ='merged.pdf';
    res.download(file);

  })
};





// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use("/steelAPI/:userId/:sheetId", steelAPIRouter);
app.use("/steelAPI2/:userId/:sheetId", steelAPIRouter2);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
