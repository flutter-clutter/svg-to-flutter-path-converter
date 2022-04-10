var svgExample = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   id="svg1257"
   version="1.1"
   viewBox="0 0 210 297"
   height="1122.5197"
   width="793.70081">
  <defs
     id="defs1251" />
  <metadata
     id="metadata1254">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title></dc:title>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <g
     id="layer1">
    <path
       d="M 0.092045,0.1 H 160.7516 V 123.98077 H 0.092045 Z"
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.18409;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       id="rect1895" />
    <path
       d="M 0.10732194,123.98077 C 14.907606,115.60293 17.703564,96.907631 17.468863,81.409182 17.597813,60.903649 25.102063,45.384571 39.986608,35.194073 57.156836,28.265986 87.511225,22.048358 109.55174,19.90672 130.12552,16.169416 142.34327,8.7265921 157.24537,0.43362209 151.76315,0.24249465 137.7906,0.31719461 134.92432,0.28847484 90.179285,0.03321951 45.045717,0.48308524 0.10732194,0.1 Z"
       style="fill:#ff5252;fill-opacity:1;stroke:none;stroke-width:0.264583px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1"
       id="path1898" />
    <path
       id="path1910"
       d="m 160.6472,26.458333 c 0,0 -10.20536,83.154757 -56.31845,88.446427 -46.113095,5.29167 -72.571428,9.07143 -72.571428,9.07143 l 128.994278,0.005 z"
       style="fill:#ffab40;fill-opacity:1;stroke:none;stroke-width:0.264583px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" />
  </g>
</svg>`;

document.addEventListener('DOMContentLoaded', function() {
    var container = document.querySelector('.code-container-wrapper');
    var flutterCodeLines = [];
    var outputConsole = document.querySelector('#console .code');

    var flutterCodeLinesBeginning = [
        ["class MyPainter extends CustomPainter {", 0],
        ["@override", 1],
        ["void paint(Canvas canvas, Size size) {", 1],
        ["Paint paint = Paint();", 2],
        ["Path path = Path();", 2],
    ];

    var flutterCodeLinesEnding = [
        ['}', 1],
        ['@override', 1],
        ['bool shouldRepaint(CustomPainter oldDelegate) {', 1],
        ['return true;', 2],
        ['}', 1],
        ['}', 0],
    ];

    var converter = {
        convert: function(svgString) {
            var fragment = Snap.parse(svgString);
            var shapes = fragment.selectAll('path, circle, rect');

            outputConsole.innerHTML = '';

            flutterCodeLines = flutterCodeLinesBeginning;
            flutterCodeLines = flutterCodeLines.concat(shapesToFlutterCodeConverter(shapes));
            flutterCodeLines = flutterCodeLines.concat(flutterCodeLinesEnding);

            outputConsole.innerHTML += consoleTextFormatter.linesToString(flutterCodeLines);
            container.style.display = 'block';
        },
    };

    var consoleTextFormatter = {
        linesToString: function(lines) {
            var returnCode = '';

            for(var lineId in lines)
            {
                var line = lines[lineId];

                for(var i=0; i<= line[1]; i++) returnCode += "  ";

                returnCode += line[0]+"\n";
            }

            return returnCode;
        }
    }

    var shapeToPathConverter = {
        fromCircle: function(pathObject) {
            var cx = pathObject.node.attributes.cx.value;
            var cy = pathObject.node.attributes.cy.value;
            var r = pathObject.node.attributes.r.value;
            var p = 'M ' + (+r + +cx) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+r + +cy) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx - +r) + ',' + cy + ' ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+cy - +r) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx + +r) + ',' + cy;
            var fill = getFillFromNode(pathObject.node);
            pathObject = pathObject.paper.path(p);
            pathObject.node.attributes.fill = {value: fill};

            return pathObject;
        },
        fromRect: function(pathObject) {
            var x = pathObject.node.attributes.x.value;
            var y = pathObject.node.attributes.y.value;
            var width = pathObject.node.attributes.width.value;
            var height = pathObject.node.attributes.height.value;

            var p = 'M ' + x + ',' + y + ' H ' + width + ' V ' + height + ' H ' + x + ' Z';
            var fill = getFillFromNode(pathObject.node);
            pathObject = pathObject.paper.path(p);
            pathObject.node.attributes.fill = {value: fill};

            return pathObject;
        }
    }

    function getPathData(paths) {
        var pathData = {
            width: 0,
            height: 0,
            paths: []
        }

        paths.forEach(function(pathObject) {
            if (pathObject.node.nodeName === 'circle') {
                pathObject = shapeToPathConverter.fromCircle(pathObject);
            }
            else if (pathObject.node.nodeName === 'rect') {
                pathObject = shapeToPathConverter.fromRect(pathObject);
            }

            var pathString = pathObject.node.attributes.d.nodeValue;

            path = Snap.path.toCubic(pathString);

            pathData.paths.push({
                type: 'path',
                node: pathObject.node,
                preparedPath: path
            });
            
            var pathBox = Snap.path.getBBox(path);

            if (pathBox.width > pathData.width) {
                pathData.width = pathBox.width;
            } 

            if (pathBox.height > pathData.height) {
                pathData.height = pathBox.height;
            }
        });

        return pathData;
    }

    function shapesToFlutterCodeConverter(shapes) {
        lines = [];
        var pathData = getPathData(shapes);

        pathData.paths.forEach(function(path, index) {
            lines.push(['\n', 0]);
            lines.push(['// Path number ' + (index + 1), 2]);
            lines.push(['\n', 0]);

            var color = colorStringToObject(getFillFromNode(path.node));
            var opacity = path.node.style['fillOpacity'] == '' ? null : path.node.style['fillOpacity'];
            if (color == null) {
                opacity = '0';
            }

            if (path.type === 'path') {
                var additionalLines = pathToFlutterConverter.convert(
                    path.preparedPath, 
                    pathData.width,
                    pathData.height,
                    color,
                    opacity
                )
                lines = lines.concat(additionalLines);
            }
        });

        return lines;
    }

    function getFillFromNode(node) {
        var fill = '';

        if (node.attributes.fill != null) {
            fill = node.attributes.fill.value;
        }
        else {
            fill = node.style.fill;   
        }

        return fill;
    }

    function colorStringToObject(value){
        if (value == 'none') {
            return null;
        }
        if (value == null) {
            return null;
        }
        if (value == '') {
            return null;
        }
        if (value[0] == '#') {
            return value.substr(1);
        }
        return(value.match(/\d+/g)).map(function(o){ 
            var val=(o*1).toString(16);
            val=(val.length>1)?val:"0"+val;
            return val;
        }).join("")
    }    

    var pathToFlutterConverter = {
        convert: function(path, width, height, color, opacity) {
            if (color == null) {
                color = 'ffffff';
            }
            var opacityString = opacity ? ('.withOpacity(' + opacity + ')') : '';
            var code = [
                ["paint.color = Color(0xff" + color + ")" + opacityString + ";", 2],
                ["path = Path();", 2],
            ];

            for(var segmentId in path)
            {
                var segment = path[segmentId];
                switch(segment[0])
                {
                    case "M":
                    case "L":
                        code.push([lineToFlutterString(segment[1], segment[2], width, height), 2]);
                        break;
                    case "C":
                        code.push([cubicToFlutterString(segment, width, height), 2]);
                        break;
                }
            }

            code.push(["canvas.drawPath(path, paint);", 2]);

            return code;
        },

    }

    var circleToFlutterConverter = {
        convert: function(circle, width, height, color, opacity) {
            if (color == null) {
                color = 'ffffff';
            }
            var opacityString = opacity ? ('.withOpacity(' + opacity + ')') : '';
            var code = [
                ["paint.color = Color(0xff" + color + ")" + opacityString + ";"],
                ["path = Path();", 2],
            ];

            code.push(["path.addOval(Rect.fromCircle(center: Offset(" + getXFactorString(circle.x, width) + "," + getYFactorString(circle.y, height) + "), radius: " + getXFactorString(circle.radius, width) + "));", 2]);
            code.push(["canvas.drawPath(path, paint);", 2]);

            return code;
        },

    }

    function cubicToFlutterString(segment, width, height) {
        var firstArgument = getXFactorString(segment[1], width) + ', ' + getYFactorString(segment[2], height);
        var secondArgument = getXFactorString(segment[3], width) + ', ' + getYFactorString(segment[4], height);
        var thirdArgument = getXFactorString(segment[5], width) + ', ' + getYFactorString(segment[6], height);

        return 'path.cubicTo(' + firstArgument + ', ' + secondArgument + ', ' + thirdArgument + ');';
    }

    function lineToFlutterString(x, y, width, height) {
        return 'path.lineTo(' + getXFactorString(x, width) + ', ' + getYFactorString(y, height) + ');';
    }

    function getXFactorString(x, width) {
        var xFactor = helpers.roundNumber(x / width, 2);

        if (xFactor >= 0.99 && xFactor <= 1.01) {
            return 'size.width';
        }

        if (Math.abs(0.5 - xFactor) <= 0.01) {
            return 'size.width / 2';
        }

        if (Math.abs(0.33 - xFactor) <= 0.01) {
            return 'size.width / 3';
        }

        if (Math.abs(0.25 - xFactor) <= 0.01) {
            return 'size.width / 4';
        }

        if (Math.abs(0.2 - xFactor) <= 0.01) {
            return 'size.width / 5';
        }

        if (xFactor > 0 && xFactor < width) {
            xFactor = 'size.width * ' + xFactor ; 
        }

        return xFactor;
    }

    function getYFactorString(y, height) {
        var yFactor = helpers.roundNumber(y / height, 2);

        if (yFactor >= 0.99 && yFactor <= 1.01) {
            return 'size.height';
        }

        if (Math.abs(0.5 - yFactor) <= 0.01) {
            return 'size.height / 2';
        }

        if (Math.abs(0.33 - yFactor) <= 0.01) {
            return 'size.height / 3';
        }

        if (Math.abs(0.25 - yFactor) <= 0.01) {
            return 'size.height / 4';
        }

        if (Math.abs(0.2 - yFactor) <= 0.01) {
            return 'size.height / 5';
        }

        if (yFactor > 0 && yFactor < height) {
            yFactor = 'size.height * ' + yFactor; 
        }

        return yFactor;
    }

    var helpers = {
        roundNumber: function(num, scale) {
          if(!("" + num).includes("e")) {
            return +(Math.round(num + "e+" + scale)  + "e-" + scale);
          } else {
            var arr = ("" + num).split("e");
            var sig = ""
            if(+arr[1] + scale > 0) {
              sig = "+";
            }
            return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
          }
        }
    }

    initFileUpload = function() {
      var uploadButton = document.querySelector('.upload-button.file');
      var fileUploadElement = document.querySelector('.file-upload');

      uploadButton.addEventListener('click', function() {
        fileUploadElement.click();
      });

      fileUploadElement.onchange = function(event) {
        var fileList = event.target.files;

        if (fileList.length == 0) {
          return;
        }

        var file = fileList[0];

        if (file == null) {
          return;
        }

        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        
        reader.onload = function (event) {
          converter.convert(event.target.result);
        }

        reader.onerror = function (evt) {
          alert("Error!");
        }

        this.value = null;
      }
    }

    copyToClipboard = function(text) {
        var dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    }

    initExampleOutputButton = function() {
      var exampleButton = document.querySelector('.upload-button.example.output');
      exampleButton.addEventListener('click', function() {
        converter.convert(svgExample);  
      });
    }

    initExampleInputButton = function() {
      var exampleButton = document.querySelector('.upload-button.example.input');
      exampleButton.addEventListener('click', function() {
        outputConsole.innerText = svgExample;
        container.style.display = 'block';
      });
    }

    initCopyCodeButton = function() {
      var copyCodeButton = document.querySelector('.copy-button');
      
      copyCodeButton.addEventListener('click', function() {
          copyToClipboard(document.querySelector('.code').innerText);
          copyCodeButton.classList.add('copied');
          copyCodeButton.innerText = 'Code copied';
         
          setTimeout(function() {
            copyCodeButton.classList.remove('copied'); 
            copyCodeButton.innerText = 'Copy code';
          }, 2000);
      });
    }

    initFileUpload();
    initExampleInputButton();
    initExampleOutputButton();
    initCopyCodeButton();
});