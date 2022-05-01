const fs = require('fs')
const { parse, stringify, parseSync } = require('svgson')
const { optimize } = require('svgo');
const svgUtils = require('./utils/svg_utils')
const flutterPath = require('./flutter_path')

function convert(filePath) {
    const data = fs.readFileSync(filePath, 'utf8')
    const optimized = optimize(data).data
    let result = converter.convert(optimized)

    console.log(result)
}

let converter = {
    convert: function (svgString) {
        let parsed = parseSync(svgString)

        let supportedShapeDefinitions = ['path', 'circle', 'rect'];

        parsed.children.map((element) => {
          element.attributes.style = styleStringToObject(element.attributes.style); 
          return element;
        });

        let layers = parsed.children.filter((value) => value.name == "g");
        let flattenedLayers = layers
          .flatMap(
            (group) => group.children.map(
              (element) => mergeGroupStylesIntoElements(group, element)
            )
          );

        let supportedShapes = flattenedLayers
          .filter((value) => supportedShapeDefinitions.includes(value.name))
          .concat(
            parsed.children.filter((value) => supportedShapeDefinitions.includes(value.name))
          );

        return shapesToFlutterCodeConverter(supportedShapes);
    },
};

function styleStringToObject(styleString) {
  let regex = /([\w-]*)\s*:\s*([^;]*)/g;
  let match, properties={};
  while(match=regex.exec(styleString)) properties[match[1]] = match[2].trim();

  return properties;
}

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

let shapeToPathConverter = {
    fromCircle: function (pathObject) {
        let cx = parseInt(pathObject.attributes.cx);
        let cy = parseInt(pathObject.attributes.cy);
        let r = parseInt(pathObject.attributes.r);
        let p = 'M ' + (+r + +cx) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+r + +cy) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx - +r) + ',' + cy + ' ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+cy - +r) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx + +r) + ',' + cy;

        return p;
    },
    fromRect: function (pathObject) {
        let x = parseInt(pathObject.attributes.x);
        let y = parseInt(pathObject.attributes.y);
        let width = parseInt(pathObject.attributes.width);
        let height = parseInt(pathObject.attributes.height);

        let p = 'M ' + x + ',' + y + ' H ' + width + ' V ' + height + ' H ' + x + ' Z';

        return p;
    }
}

function getPathData(paths) {
    let pathData = {
        width: 0,
        height: 0,
        paths: []
    }

    paths.forEach((pathObject) => {
        let pathString;
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

        let pathBox = svgUtils.pathBBox(path);

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
    let printer = new flutterPath.FlutterCustomPaintPrinter();
    let flutterPaths = [];

    lines = [];
    let pathData = getPathData(shapes);
    
    pathData.paths.forEach((path, index) => {
        let pathOperations = [];

        if (path.type !== 'path') {
          return;
        }

        path.preparedPath.forEach((segment) => {
            switch (segment[0]) {
                case "M":
                    pathOperations.push(
                        new flutterPath.MoveToOperation(
                            segment[1] / pathData.width, segment[2] / pathData.height
                        )
                    );
                    break;
                case "L":
                    pathOperations.push(
                        new flutterPath.LineToOperation(
                            segment[1] / pathData.width, segment[2] / pathData.height
                        )
                    );
                    break;
                case "C":
                    pathOperations.push(
                        new flutterPath.CubicToOperation(
                            segment[1] / pathData.width,
                            segment[2] / pathData.height,
                            segment[3] / pathData.width,
                            segment[4] / pathData.height,
                            segment[5] / pathData.width,
                            segment[6] / pathData.height,
                        )
                    );
                    break;
            }
        });

        let color = colorStringToObject(path.node.attributes.style.fill);
        let opacity = path.node.attributes.style['fill-opacity'] == '' ? null : path.node.attributes.style['fill-opacity'];
        if (color == null) {
            opacity = '0';
        }

        flutterPaths.push(new flutterPath.FlutterPath(pathOperations, color, opacity));
    });

    return printer.print(flutterPaths);
}

function getFillFromNode(node) {
    let fill = '';

    if (node.attributes.fill != null) {
        fill = node.attributes.fill.value;
    }
    else {
        fill = node.style.fill;
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
        let color = value;
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
        let val = (o * 1).toString(16);
        val = (val.length > 1) ? val : "0" + val;
        return val;
    }).join("")
}

let circleToFlutterConverter = {
    convert: (circle, width, height, color, opacity) => {
        if (color == null) {
            color = 'ffffff';
        }
        let opacityString = opacity ? ('.withOpacity(' + opacity + ')') : '';
        let code = [
            ["paint.color = Color(0xff" + color + ")" + opacityString + ";"],
            ["path = Path();", 2],
        ];

        code.push(["path.addOval(Rect.fromCircle(center: Offset(" + getXFactorString(circle.x, width) + "," + getYFactorString(circle.y, height) + "), radius: " + getXFactorString(circle.radius, width) + "));", 2]);
        code.push(["canvas.drawPath(path, paint);", 2]);

        return code;
    }
}

module.exports = convert
