class FlutterPath {
  constructor(operations, color, opacity) {
    this.operations = operations;
    this.color = color;
    this.opacity = opacity;
  }
}

class PathOperation {
  createSizeDependentToken(sizeProperty, number, round) {
    const roundedNumber = helpers.roundNumber(number, round);

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
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);

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
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);

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
    const x1 = this.createSizeDependentToken('width', this.x1, round);
    const y1 = this.createSizeDependentToken('height', this.y1, round);
    const x2 = this.createSizeDependentToken('width', this.x2, round);
    const y2 = this.createSizeDependentToken('height', this.y2, round);
    const x3 = this.createSizeDependentToken('width', this.x3, round);
    const y3 = this.createSizeDependentToken('height', this.y3, round);

    return `path.cubicTo(${x1}, ${y1}, ${x2}, ${y2}, ${x3}, ${y3});`;
  }
}

class AddOvalOperation extends PathOperation {
  constructor(x, y, radius) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  toFlutterCommand(round = 2) {
    const x = this.createSizeDependentToken('width', this.x, round);
    const y = this.createSizeDependentToken('height', this.y, round);
    const radius = this.createSizeDependentToken('width', this.radius, round);

    return `path.addOval(Rect.fromCircle(center: Offset(${x}, ${y}), radius: ${radius}));`;
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
    const linesBefore = [
      `class ${name} extends CustomPainter {`,
      '\t@override',
      '\tvoid paint(Canvas canvas, Size size) {',
      '\t\tPath path = Path();',
      '\t\tfinal Paint paint = Paint();'
    ];

    const linesAfter = [
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
      linesPaths.push('');
      linesPaths.push(`\t\t// Path ${index+1}`);

      if (index > 0) {
        linesPaths.push('\t\tpath = Path();');
      }


      let color = path.color;

      if (color == null) {
          color = '000000';
      }

      const opacityString = path.opacity ? `.withOpacity(${path.opacity})` : '';
      const colorCommand = "paint.color = const Color(0xff" + color + ")" + opacityString + ";"
      const colorCommandString = `\t\t${colorCommand}`;

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

let helpers = {
    roundNumber: function (num, scale) {
        if (!("" + num).includes("e")) {
            return +(Math.round(num + "e+" + scale) + "e-" + scale);
        } else {
            let arr = ("" + num).split("e");
            let sig = ""
            if (+arr[1] + scale > 0) {
                sig = "+";
            }
            return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
        }
    }
}

module.exports = {
  FlutterCustomPaintPrinter,
  FlutterPath,
  MoveToOperation,
  LineToOperation,
  CubicToOperation,
  AddOvalOperation
};