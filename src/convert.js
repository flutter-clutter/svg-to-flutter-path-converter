const fs = require('fs')
const { parse, stringify, parseSync } = require('svgson')
const { optimize } = require('svgo');
const svgUtils = require('./utils/svg_utils')
const flutterPath = require('./flutter_path')
const namedColors = require('color-name-list');

class SvgNode {
  constructor(name, type, attributes) {
    this.name = name;
    this.type = type;
    this.attributes = attributes;
  }
}

class SvgToFlutterPathConverter {
  static supportedShapeDefinitions = ['path', 'circle', 'rect'];

  convertFromFilePath(filePath, config) {
    const data = fs.readFileSync(filePath, 'utf8');
    
    const optimized = optimize(data, {
      convertStyleToAttrs: true,
    }).data;
    
    return this.convertFromString(optimized, config);
  }

  convertFromString(svgString, config) {
    let wholeSvg = parseSync(svgString);
    
    let parsedNodes = wholeSvg.children;
    
    var width = wholeSvg.attributes.width;
    var height = wholeSvg.attributes.height;

    if(wholeSvg.attributes.viewBox) {
      let viewBoxValues = wholeSvg.attributes.viewBox.split(" ");
      width = parseFloat(viewBoxValues[2]) - parseFloat(viewBoxValues[0]);
      height = parseFloat(viewBoxValues[1]) - parseFloat(viewBoxValues[3]);
    }


    let groups = this.flattenGroupAttribute(parsedNodes);
    let filteredNodes = this.filterSupportedNodes(groups, parsedNodes);

    let svgNodes = filteredNodes
      .map((element) => {
        element.attributes.style = this.styleStringToObject(element.attributes.style);
        return element;
      })
      .map((element) => new SvgNode(element.name, element.type, element.attributes));

    return shapesToFlutterCodeConverter(filteredNodes, width, height, config);
  }

  filterSupportedNodes(nodes, groups) {
    let supportedShapeDefinitions = ['path', 'circle', 'rect'];

    return groups
      .filter((value) => supportedShapeDefinitions.includes(value.name))
      .concat(
        nodes.filter((value) => supportedShapeDefinitions.includes(value.name))
      );
  }

  flattenGroupAttribute(nodes) {
    let groups = nodes.filter((svgNode) => svgNode.name == "g");

    return groups
      .flatMap(
        (group) => group.children.map(
          (svgNode) => this.mergeGroupStylesIntoElements(group, svgNode)
        )
      );
  }

  styleStringToObject(styleString) {
    let regex = /([\w-]*)\s*:\s*([^;]*)/g;
    let match, properties = {};
    while (match = regex.exec(styleString)) properties[match[1]] = match[2].trim();

    return properties;
  }

  mergeGroupStylesIntoElements(group, element) {
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
  };
}

class ShapeToPathConverter {
  fromRect(pathObject) {
    let x = parseInt(pathObject.attributes.x);
    let y = parseInt(pathObject.attributes.y);
    let width = parseInt(pathObject.attributes.width);
    let height = parseInt(pathObject.attributes.height);

    let p = 'M ' + x + ',' + y + ' H ' + width + ' V ' + height + ' H ' + x + ' Z';

    return p;
  }

  fromCircle(pathObject) {
    let cx = parseInt(pathObject.attributes.cx);
    let cy = parseInt(pathObject.attributes.cy);
    let r = parseInt(pathObject.attributes.r);
    let p = 'M ' + (+r + +cx) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+r + +cy) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx - +r) + ',' + cy + ' ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+cy - +r) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx + +r) + ',' + cy;

    return p;
  }
}

function getPathData(paths, width, height) {
  let pathData = {
    width: width,
    height: height,
    paths: []
  }

  let shapeToPathConverter = new ShapeToPathConverter();

  paths.forEach((svgNode) => {
    let pathString;
    if (svgNode.name === 'circle') {
      pathString = shapeToPathConverter.fromCircle(svgNode);
    } else if (svgNode.name === 'rect') {
      pathString = shapeToPathConverter.fromRect(svgNode);
    } else {
      pathString = svgNode.attributes.d;
    }
    
    let closed = pathString.endsWith("Z");

    path = svgUtils.path2curve(pathString)
    path = changeLineCubicsToLines(path);

    pathData.paths.push({
      type: svgNode.name,
      node: svgNode,
      preparedPath: path,
      closed: closed
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


function getFillFromNode(node) {
  if (node.attributes.fill != null) {
    return node.attributes.fill;
  }

  if (node.attributes.style !== undefined && node.attributes.style.fill !== undefined) {
    return node.attributes.style.fill;
  }

  return '';
}

function getStrokeFromNode(node) {
  if (node.attributes.stroke != null) {
    return node.attributes.stroke;
  }

  if (node.attributes.style !== undefined && node.attributes.style.stroke !== undefined) {
    return node.attributes.style.stroke;
  }

  return '';
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
  let namedColor = namedColors.find(color => color.name.toLowerCase() === value.toLowerCase());
  if (namedColor != null) {
    return namedColor.hex.replace("#", "");
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

function normalizeNumber(number) {
  return number.replace(/[^0-9]/g, '');
}

function changeLineCubicsToLines(values) {
    function isCubicThatCouldBeLine(element) {
        return (element[0] == "C") && element.length >= 6 && element[3] == element[5] && element[4] == element[6];
    }

    return values.map((element) => {
        if (isCubicThatCouldBeLine(element)) {
            return ["L", ...element.slice(3, 5)];
        }
        return element;
    });
}

function shapesToFlutterCodeConverter(shapes, width, height, config) {
    let printer = new flutterPath.FlutterCustomPaintPrinter();
    let flutterPaths = [];

  lines = [];
  let pathData = getPathData(shapes, width, height);

  pathData.paths.forEach((path, index) => {
    let pathOperations = [];

    if (path.type === 'circle') {
      pathOperations.push(
        new flutterPath.AddOvalOperation(
          normalizeNumber(path.node.attributes.cx) / pathData.width,
          normalizeNumber(path.node.attributes.cy) / pathData.height,
          normalizeNumber(path.node.attributes.r) / pathData.width
        )
      );

      let color = colorStringToObject(getFillFromNode(path.node));
      let opacity = path.node.attributes.style['fill-opacity'] == '' ? null : path.node.attributes.style['fill-opacity'];
      if (color == null) {
        color = 'ffffff';
        opacity = '1';
      }
      if (path.node.attributes['fill'] != 'none') {
        flutterPaths.push(new flutterPath.FlutterPath(pathOperations, color, opacity, flutterPath.PaintType.Fill));
      }
      if (path.node.attributes['stroke'] != null) {
        let strokeColor = colorStringToObject(getStrokeFromNode(path.node));
        let strokeOpacity = path.node.attributes.style['stroke-opacity'] == '' ? null : path.node.attributes.style['stroke-opacity'];
        flutterPaths.push(new flutterPath.FlutterPath(pathOperations, strokeColor, strokeOpacity, flutterPath.PaintType.Stroke));
      }

      return;
    }

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

    let color = colorStringToObject(getFillFromNode(path.node));
    
    let opacity = path.node.attributes.style['fill-opacity'] == '' ? null : path.node.attributes.style['fill-opacity'];
    if (color == null) {
      opacity = '1';
    }

    if (path.node.attributes['fill'] != 'none') {
      flutterPaths.push(new flutterPath.FlutterPath(pathOperations, color, opacity, flutterPath.PaintType.Fill));
    }

    if (path.node.attributes['stroke'] != null) {
      let strokeColor = colorStringToObject(getStrokeFromNode(path.node));
      let strokeOpacity = path.node.attributes.style['stroke-opacity'] == '' ? null : path.node.attributes.style['stroke-opacity'];
      let strokeWidth = path.node.attributes['stroke-width'] == '' ? null : path.node.attributes['stroke-width'];
      flutterPaths.push(new flutterPath.FlutterPath(pathOperations, strokeColor, strokeOpacity, flutterPath.PaintType.Stroke, strokeWidth, path.closed));
    }
  });

  return printer.print(flutterPaths, config);
}

module.exports = SvgToFlutterPathConverter
