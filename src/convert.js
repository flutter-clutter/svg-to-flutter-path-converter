const fs = require('fs')
const { parse, stringify, parseSync } = require('svgson')
const { optimize } = require('svgo');
const svgUtils = require('./utils/svg_utils')
const flutterPath = require('./flutter_path')

class SvgNode {
  constructor(name, type, attributes) {
    this.name = name;
    this.type = type;
    this.attributes = attributes;
  }
}

class SvgToFlutterPathConverter {
  static supportedShapeDefinitions = ['path', 'circle', 'rect'];

  convertFromFilePath(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const optimized = optimize(data).data;

    return this.convertFromString(optimized);
  }

  convertFromString(svgString) {
      let parsedNodes = parseSync(svgString).children;
      let groups = this.flattenGroupAttribute(parsedNodes);
      let filteredNodes = this.filterSupportedNodes(groups, parsedNodes);

      let svgNodes = filteredNodes
        .map((element) => {
          element.attributes.style = this.styleStringToObject(element.attributes.style);
          return element;
        })
        .map((element) => new SvgNode(element.name, element.type, element.attributes));

      return shapesToFlutterCodeConverter(filteredNodes);
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
    let match, properties={};
    while(match=regex.exec(styleString)) properties[match[1]] = match[2].trim();

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
    fromRect (pathObject) {
        let x = parseInt(pathObject.attributes.x);
        let y = parseInt(pathObject.attributes.y);
        let width = parseInt(pathObject.attributes.width);
        let height = parseInt(pathObject.attributes.height);

        let p = 'M ' + x + ',' + y + ' H ' + width + ' V ' + height + ' H ' + x + ' Z';

        return p;
    }

    fromCircle (pathObject) {
        let cx = parseInt(pathObject.attributes.cx);
        let cy = parseInt(pathObject.attributes.cy);
        let r = parseInt(pathObject.attributes.r);
        let p = 'M ' + (+r + +cx) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+r + +cy) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx - +r) + ',' + cy + ' ' + r + ',' + r + ' 0 0 1 ' + cx + ',' + (+cy - +r) + ' ' + r + ',' + r + ' 0 0 1 ' + (+cx + +r) + ',' + cy;

        return p;
    }
}

function getPathData(paths) {
    let pathData = {
        width: 0,
        height: 0,
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

        path = svgUtils.path2curve(pathString)

        pathData.paths.push({
            type: svgNode.name,
            node: svgNode,
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


function getFillFromNode(node) {
    if (node.attributes.fill != null) {
        return node.attributes.fill;
    }

    if (node.attributes.style !== undefined && node.attributes.style.fill !== undefined) {
      return node.attributes.style.fill;
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
  return number.replace(/[^0-9]/g,'');
}

function shapesToFlutterCodeConverter(shapes) {
    let printer = new flutterPath.FlutterCustomPaintPrinter();
    let flutterPaths = [];

    lines = [];
    let pathData = getPathData(shapes);
    
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
            opacity = '0';
          }
          flutterPaths.push(new flutterPath.FlutterPath(pathOperations, color, opacity));

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
            opacity = '0';
        }

        flutterPaths.push(new flutterPath.FlutterPath(pathOperations, color, opacity));
    });

    return printer.print(flutterPaths);
}

module.exports = SvgToFlutterPathConverter
