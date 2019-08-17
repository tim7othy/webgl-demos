(function() {
  var canvas = document.getElementById("gl-canvas")
  var gl = canvas.getContext("webgl")

  if(!gl) {
    throw new Error("Do not support webgl")
  }

  var getVertexShaderSource = function() {
    return `
      attribute vec2 a_position;

      uniform vec2 u_resolution;
      uniform vec2 u_translation;
      uniform vec2 u_rotation;
      uniform vec2 u_scale;

      void main() {
        vec2 scaledPosition = a_position * u_scale;
        vec2 rotatedPosition = vec2(
          scaledPosition.x * u_rotation.x - scaledPosition.y * u_rotation.y,
          scaledPosition.x * u_rotation.y + scaledPosition.y * u_rotation.x
        );
        vec2 position = rotatedPosition + u_translation;

        vec2 zeroToOne = position / u_resolution;

        vec2 zeroToTwo = zeroToOne * 2.0;

        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
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
  var scaleUniformLocation = gl.getUniformLocation(program, "u_scale")
  var rotationUniformLocation = gl.getUniformLocation(program, "u_rotation")
  var translationUniformLocation = gl.getUniformLocation(program, "u_translation")
  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")
  var colorUniformLocation = gl.getUniformLocation(program, "u_color")

  // 创建存储坐标点的缓冲区,之后如果需要使用,使用gl.bindBuffer绑定即可
  var positionBuffer = gl.createBuffer()

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

  var drawScene = function(gl, scale, rotation, translation) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    // 设置所有全局变量
    gl.uniform2f(resolutionUniformLocation, 400, 300)
    gl.uniform4f(colorUniformLocation, Math.random(), Math.random(), Math.random(), 1)

    gl.uniform2f(scaleUniformLocation, scale[0], scale[1])
    gl.uniform2f(rotationUniformLocation, rotation[0], rotation[1])
    gl.uniform2f(translationUniformLocation, translation[0], translation[1])

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
    var rotation = [1, 0]
    var translation = [0, 0]
    setInterval(function() {
      drawScene(gl, scale, rotation, translation)
      scale[0] += 0.1
      scale[1] += 0.1
      translation[0] += 5
      translation[1] += 3
      // theta += 1
      // rotation[0] = Math.cos(theta / 180 * Math.PI)
      // rotation[1] = Math.sin(theta / 180 * Math.PI)
    }, 30)
  }

  main()



}())