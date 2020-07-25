var express = require('express');
var app = express();

var config = require('./config.js')

var multer  = require('multer')
var upload = multer({ dest: 'uploads/' });

var AWS = require('aws-sdk');
AWS.config.region = config.region;

var uuid = require('node-uuid');
var fs = require('fs-extra');
var path = require('path');
const { RSA_NO_PADDING } = require('constants');



//HTML
app.use(express.static('public'));

//AWS Rekognition Object - AWS SDK
var rekognition = new AWS.Rekognition({region: config.region});


//Post file for face Match
app.post('/api/recognize', upload.single("image"), function (req, res, next) {
	var bitmap = fs.readFileSync(req.file.path);

	rekognition.searchFacesByImage({
	 	"CollectionId": config.collectionName,
	 	"FaceMatchThreshold": 0,
	 	"Image": { 
	 		"Bytes": bitmap,
	 	},
	 	"MaxFaces": 1
	}, function(err, data) {
	 	if (err) {
	 		res.send(err);
	 	} else {
			if(data.FaceMatches && data.FaceMatches.length > 0 && data.FaceMatches[0].Face)
			{
				var jsn=JSON.stringify(data.FaceMatches[0].Face);	
				res.send("Json output : " + jsn + " || Confidence: " +data.FaceMatches[0].Face.Confidence.toString() + " Match : " + data.FaceMatches[0].Similarity.toString());
			} else {
				res.send("Not recognized");
			}
		}
	});
});


//API for adding faces in collection. Source folder : faces (hard coded)
app.get('/api/indexfaces', function (req, res) {
	indexFaces();
	res.send("All faces added");
  })

//API for creating collection
  app.get('/api/createcollection', function (req, res) {
	createCollection();
	res.send("Collection Created");
  })


  

  function indexFaces() {
	var klawSync = require('klaw-sync')
	var paths = klawSync('./faces', { nodir: true, ignore: [ "*.json" ] });

	paths.forEach((file) => {
		console.log(file.path);
		var p = path.parse(file.path);
		var name = p.name.replace(/\W/g, '');
		var bitmap = fs.readFileSync(file.path);

		rekognition.indexFaces({
		   "CollectionId": config.collectionName,
		   "DetectionAttributes": [ "ALL" ],
		   "ExternalImageId": name,
		   "Image": { 
			  "Bytes": bitmap
		   }
		}, function(err, data) {
			if (err) {
					return err;
					} else {
					fs.writeJson(file.path + ".json", data, err => {
					if (err) return err;
				});
			}
		});
	});
}


function createCollection() {
	rekognition.createCollection( { "CollectionId": config.collectionName }, function(err, data) {
	  if (err) {
		console.log(err, err.stack); // an error occurred
	  } else {
		console.log(data);           // successful response
	  }
	});
}

app.listen(8080, function () {
	console.log('Listening on port 8080!');
})