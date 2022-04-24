const fs = require('fs')
const { parse, stringify, parseSync } = require('svgson')
const { optimize } = require('svgo');
const svgUtils = require('./utils/svg_utils')

function convert(filePath) {

    const data = fs.readFileSync(filePath, 'utf8')
    const optimized = optimize(data).data
    var result = converter.convert(optimized)

    var formatted = consoleTextFormatter.linesToString(result)
    console.log(formatted)
}

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
    convert: function (svgString) {

        var parsed = parseSync(svgString)

        var supportedShapeDefinitions = ['path', 'circle', 'rect'];
        var flutterCodeLines = [];

        var layers = parsed.children.filter((value) => value.name == "g");
        var flatten = layers.flatMap((group) => group.children.map((element) => mergeGroupStylesIntoElements(group, element)));
        var supportedShapes = flatten.filter((value) => supportedShapeDefinitions.includes(value.name)).concat(parsed.children.filter((value) => supportedShapeDefinitions.includes(value.name)))

        var code = shapesToFlutterCodeConverter(supportedShapes)

        flutterCodeLines = flutterCodeLinesBeginning;
        flutterCodeLines = flutterCodeLines.concat(code);
        flutterCodeLines = flutterCodeLines.concat(flutterCodeLinesEnding);

        return flutterCodeLines
    },
};

function mergeGroupStylesIntoElements(group, element) {
    if (group.attributes != null) {
        return {
            ...element,
            "attributes": {
                ...element.attributes,
                ...group.attributes,
            }
        }
    } else {
        return element;
    }
}

var consoleTextFormatter = {
    linesToString: function (lines) {
        var returnCode = '';

        for (var lineId in lines) {
            var line = lines[lineId];

            for (var i = 0; i <= line[1]; i++) returnCode += "  ";

            returnCode += line[0] + "\n";
        }

        return returnCode;
    }
}

var shapeToPathConverter = {
    fromCircle: function (pathObject) {
        var cx = parseInt(pathObject.attributes.cx);
        var cy = parseInt(pathObject.attributes.cy);
        var r = parseInt(pathObject.attributes.r);
        var p = 'M ' + (+r + +cx) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+r + +cy) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx - +r) + ',' + cy + ' ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+cy - +r) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx + +r) + ',' + cy;

        return p;
    },
    fromRect: function (pathObject) {
        var x = parseInt(pathObject.attributes.x);
        var y = parseInt(pathObject.attributes.y);
        var width = parseInt(pathObject.attributes.width);
        var height = parseInt(pathObject.attributes.height);

        var p = 'M ' + x + ',' + y + ' H ' + width + ' V ' + height + ' H ' + x + ' Z';

        return p;
    }
}

function getPathData(paths) {
    var pathData = {
        width: 0,
        height: 0,
        paths: []
    }

    paths.forEach(function (pathObject) {
        var pathString;
        if (pathObject.name === 'circle') {
            pathString = shapeToPathConverter.fromCircle(pathObject);
        } else if (pathObject.name === 'rect') {
            pathString = shapeToPathConverter.fromRect(pathObject);
        } else {
            pathString = pathObject.attributes.d;
        }

        path = svgUtils.path2curve(pathString)

        pathData.paths.push({
            type: 'path',
            node: pathObject,
            preparedPath: path
        });

        var pathBox = svgUtils.pathBBox(path);

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
    
    pathData.paths.forEach(function (path, index) {
        lines.push(['// Path number ' + (index + 1), 2]);
        lines.push(['\n', 0]);

        var color = colorStringToObject(getFillFromNode(path.node));
        var opacity = path.node.attributes['fillOpacity'] == '' ? null : path.node.attributes['fillOpacity'];

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
        fill = node.attributes.fill;
    }
    else {
        fill = node.attributes.fill;
    }

    return fill;
}

function colorStringToObject(value) {
    if (value == 'none') {
        return null;
    }
    if (value == null) {
        return null;
    }
    if (value == '') {
        return null;
    }
    if (value[0] == '#' && value.length === 4) {
        var color = value;
        color = color.split("").map((item) => {
            if (item == "#") { return item }
            return item + item;
        }).join("")

        if (color[0] != "#") {
            color = "#" + color;
        }
        return color.substr(1);
    }
    if (value[0] == '#') {
        return value.substr(1);
    }
    return (value.match(/\d+/g)).map(function (o) {
        var val = (o * 1).toString(16);
        val = (val.length > 1) ? val : "0" + val;
        return val;
    }).join("")
}

var pathToFlutterConverter = {
    convert: function (path, width, height, color, opacity) {
        if (color == null) {
            color = '000000';
        }

        var opacityString = opacity ? ('.withOpacity(' + opacity + ')') : '';
        
        var code = [
            ["paint.color = Color(0xff" + color + ")" + opacityString + ";", 2],
            ["path = Path();", 2],
        ];

        for (var segmentId in path) {
            var segment = path[segmentId];
            switch (segment[0]) {
                case "M":
                    code.push([moveToFlutterString(segment[1], segment[2], width, height), 2]);
                    break;
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
    convert: function (circle, width, height, color, opacity) {
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

function moveToFlutterString(x, y, width, height) {
    return 'path.moveTo(' + getXFactorString(x, width) + ', ' + getYFactorString(y, height) + ');';
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
        xFactor = 'size.width * ' + xFactor;
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
    roundNumber: function (num, scale) {
        if (!("" + num).includes("e")) {
            return +(Math.round(num + "e+" + scale) + "e-" + scale);
        } else {
            var arr = ("" + num).split("e");
            var sig = ""
            if (+arr[1] + scale > 0) {
                sig = "+";
            }
            return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
        }
    }
}

module.exports = convert
