(function() {
  var canvas = document.getElementById("gl-canvas")
  var gl = canvas.getContext("webgl")

  if(!gl) {
    throw new Error("Do not support webgl")
  }

  var getVertexShaderSource = function() {
    return `
      attribute vec2 a_position;

      uniform mat3 u_matrix;
      void main() {
        gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
      }
    `
  }

  var getFragmentShaderSource = function() {
    return `
      precision mediump float;

      uniform vec4 u_color;

      void main() {
        gl_FragColor = u_color;
      }
    `
  }

  var program = glUtils.initProgram(gl, getVertexShaderSource(), getFragmentShaderSource())

  // 从着色程序中获取属性以及全局变量在内存中的位置，以便于对它们赋值
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
  var matrixUniformLocation = gl.getUniformLocation(program, "u_matrix")
  var colorUniformLocation = gl.getUniformLocation(program, "u_color")

  // 创建存储坐标点的缓冲区,之后如果需要使用,使用gl.bindBuffer绑定即可
  var positionBuffer = gl.createBuffer()

  var m3 = {
    translation: function(tx, ty) {
      return [
        1, 0, 0,
        0, 1, 0,
        tx, ty, 1,
      ];
    },

    rotation: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
      return [
        c,-s, 0,
        s, c, 0,
        0, 0, 1,
      ];
    },

    scaling: function(sx, sy) {
      return [
        sx, 0, 0,
        0, sy, 0,
        0, 0, 1,
      ];
    },

    multiply: function(a, b) {
      var a00 = a[0 * 3 + 0];
      var a01 = a[0 * 3 + 1];
      var a02 = a[0 * 3 + 2];
      var a10 = a[1 * 3 + 0];
      var a11 = a[1 * 3 + 1];
      var a12 = a[1 * 3 + 2];
      var a20 = a[2 * 3 + 0];
      var a21 = a[2 * 3 + 1];
      var a22 = a[2 * 3 + 2];
      var b00 = b[0 * 3 + 0];
      var b01 = b[0 * 3 + 1];
      var b02 = b[0 * 3 + 2];
      var b10 = b[1 * 3 + 0];
      var b11 = b[1 * 3 + 1];
      var b12 = b[1 * 3 + 2];
      var b20 = b[2 * 3 + 0];
      var b21 = b[2 * 3 + 1];
      var b22 = b[2 * 3 + 2];
      return [
        b00 * a00 + b01 * a10 + b02 * a20,
        b00 * a01 + b01 * a11 + b02 * a21,
        b00 * a02 + b01 * a12 + b02 * a22,
        b10 * a00 + b11 * a10 + b12 * a20,
        b10 * a01 + b11 * a11 + b12 * a21,
        b10 * a02 + b11 * a12 + b12 * a22,
        b20 * a00 + b21 * a10 + b22 * a20,
        b20 * a01 + b21 * a11 + b22 * a21,
        b20 * a02 + b21 * a12 + b22 * a22,
      ];
    },
    projection: function(width, height) {
      // 注意：这个矩阵翻转了 Y 轴，所以 0 在上方
      return [
        2 / width, 0, 0,
        0, -2 / height, 0,
        -1, 1, 1
      ];
    },

  }

  var setRectangle = function(gl, x, y, w, h) {
    var x1 = x;
    var x2 = x + w;
    var y1 = y;
    var y2 = y + h;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ]),
        gl.STATIC_DRAW);
  }

  var setGeometry = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
          // 左竖
          0, 0,
          30, 0,
          0, 150,
          0, 150,
          30, 0,
          30, 150,

          // 上横
          30, 0,
          100, 0,
          30, 30,
          30, 30,
          100, 0,
          100, 30,

          // 中横
          30, 60,
          67, 60,
          30, 90,
          30, 90,
          67, 60,
          67, 90,
      ]),
      gl.STATIC_DRAW
    )


  }

  var drawScene = function(gl, scale, angleInRadians, translation) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    // 设置所有全局变量
    gl.uniform4f(colorUniformLocation, Math.random(), Math.random(), Math.random(), 1)

    // Compute the matrices
    var translationMatrix = m3.translation(translation[0], translation[1]);
    var rotationMatrix = m3.rotation(angleInRadians);
    var scaleMatrix = m3.scaling(scale[0], scale[1]);

    var projectionMatrix = m3.projection(
        gl.canvas.clientWidth, gl.canvas.clientHeight);
 
 
    // 矩阵相乘
    var matrix = m3.multiply(projectionMatrix, translationMatrix);
    matrix = m3.multiply(matrix, rotationMatrix);
    matrix = m3.multiply(matrix, scaleMatrix);

    // Set the matrix.
    gl.uniformMatrix3fv(matrixUniformLocation, false, matrix);


    // 设置顶点属性及缓冲区
    gl.enableVertexAttribArray(positionAttributeLocation)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // 告诉属性如何读取缓冲区中的数据
    var size = 2
    var type = gl.FLOAT
    var normalized = false
    var stride = 0
    var offset = 0
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalized, stride, offset)

    // 绘制图形
    var primitiveType = gl.TRIANGLES
    var offset = 0
    var count = 18
    gl.drawArrays(primitiveType, offset, count)

  }

  var main =  function() {
    setGeometry(gl)
    var scale = [1, 1]
    var theta = 0
    var angleInRadians = 0
    var translation = [0, 0]
    setInterval(function() {
      drawScene(gl, scale, angleInRadians, translation)
      // scale[0] += 0.1
      // scale[1] += 0.1
      translation[0] += 5
      translation[1] += 3
      theta += 1
      angleInRadians = theta / 180 * Math.PI
    }, 30)
  }

  main()



}())