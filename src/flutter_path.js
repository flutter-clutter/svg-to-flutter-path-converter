class FlutterPath {
  constructor(operations, color, opacity) {
    this.operations = operations;
    this.color = color;
    this.opacity = opacity;
  }
}

class PathOperation {
  createSizeDependentToken(sizeProperty, number, round) {
    let roundedNumber = helpers.roundNumber(number, round);

    if (roundedNumber == 0) {
      return '0';
    }

    if (roundedNumber == 1) {
      return `size.${sizeProperty}`;
    }

    return `size.${sizeProperty} * ${roundedNumber}`;
  }
}

class MoveToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 2) {
    let x = this.createSizeDependentToken('width', this.x, round);
    let y = this.createSizeDependentToken('height', this.y, round);

    return `path.moveTo(${x}, ${y});`;
  }
}

class LineToOperation extends PathOperation {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toFlutterCommand(round = 2) {
    let x = this.createSizeDependentToken('width', this.x, round);
    let y = this.createSizeDependentToken('height', this.y, round);

    return `path.moveTo(${x}, ${y});`;
  }
}

class CubicToOperation extends PathOperation {
  constructor(x1, y1, x2, y2, x3, y3) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.x3 = x3;
    this.y3 = y3;
  }

  toFlutterCommand(round = 2) {
    let x1 = this.createSizeDependentToken('width', this.x1, round);
    let y1 = this.createSizeDependentToken('height', this.y1, round);
    let x2 = this.createSizeDependentToken('width', this.x2, round);
    let y2 = this.createSizeDependentToken('height', this.y2, round);
    let x3 = this.createSizeDependentToken('width', this.x3, round);
    let y3 = this.createSizeDependentToken('height', this.y3, round);

    return `path.cubicTo(${x1}, ${y1}, ${x2}, ${y2}, ${x3}, ${y3});`;
  }
}

class FlutterPathPrinter {
    constructor(path) {
      this.path = path;
    }

    print() {
      return "TEST!";
    }
}

class FlutterCustomPaintPrinter {
  print(paths, name = 'MyPainter') {
    let linesBefore = [
      `class ${name} extends CustomPainter {`,
      '\t@override',
      '\tvoid paint(Canvas canvas, Size size) {',
      '\t\tPath path = Path();',
      '\t\tPaint paint = Paint();'
    ];

    let linesAfter = [
      '\t}',
      '',
      '\t@override',
      '\tbool shouldRepaint(CustomPainter oldDelegate) {',
      '\t\treturn true;',
      '\t}',
      '}'
    ];

    let linesPaths = [];

    paths.forEach((path, index) => {
      /*if (index == 0) {
        linesPaths.push('\t\tPath path = Path();');
      }*/

      linesPaths.push('');
      linesPaths.push(`\t\t// Path ${index+1}`);

      /*if (index > 0) {
        linesPaths.push('\t\tpath = Path();');
      }*/


      let color = path.color;

      if (color == null) {
          color = '000000';
      }

      let opacityString = path.opacity ? `.withOpacity(${path.opacity})` : '';
      let colorCommand = "paint.color = Color(0xff" + color + ")" + opacityString + ";"
      let colorCommandString = `\t\t${colorCommand}`;

      linesPaths.push(colorCommandString);
      path.operations.forEach((operation) => {
        linesPaths.push(`\t\t${operation.toFlutterCommand()}`);
      });

      linesPaths.push('\t\tcanvas.drawPath(path, paint);');
    });

    return linesBefore
      .concat(linesPaths)
      .concat(linesAfter).join('\n');
  }
}

// TODO: Here?

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

module.exports = {
  FlutterCustomPaintPrinter, FlutterPath, MoveToOperation, LineToOperation, CubicToOperation
};






// TODO: OLD STUFF I MIGHT STILL NEED
/*
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
*/