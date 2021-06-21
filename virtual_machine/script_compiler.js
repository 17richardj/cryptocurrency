var compileScript = function(program) {

    var buffers = [];

    var bytes = 0;

    for (var i = 0, len = program.length; i < len; i++) {

        var code = program[i];

        var type = typeof(code);

        switch (type) {

            case 'number':

                buffers.push(numberToInt8(code));

                bytes++;

                break;

            case 'object': // already encoded

                operand = code;

                buffers.push(numberToInt8(operand.length));

                buffers.push(operand);

                bytes += operand.length + 1;

                break;

            case 'string': // not yet encoded

                var operand = new Buffer(code, 'hex');

                buffers.push(numberToInt8(operand.length));

                buffers.push(operand);

                bytes += operand.length + 1;

                break;

        }

    }

    buffers.unshift(numberToInt8(bytes));

    return Buffer.concat(buffers);

};


var script = [numberToInt32LE(16), OP_DUP, OP_ADD];
