var canvas = document.getElementById("gl-canvas")
var gl = canvas.getContext("webgl")

if(!gl) {
  throw new Error("Do not support webgl")
}

var getVertexShaderSource = function() {
  return `
    attribute vec2 a_position;

    uniform vec2 u_resolution;

    void main() {
      vec2 zeroToOne = a_position / u_resolution;

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

var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")
var colorUniformLocation = gl.getUniformLocation(program, "u_color")

var positionBuffer = gl.createBuffer()

var setGeometry = function(gl) {
  var positions = [
    0, -100,
    150, 125,
    -175, 100
  ]
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
}

var drawScene = function(gl) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)

  gl.uniform2f(resolutionUniformLocation, 400, 300)
  gl.uniform4f(colorUniformLocation, Math.random(), Math.random(), Math.random(), 1)
  // 设置顶点属性即缓冲区
  gl.enableVertexAttribArray(positionAttributeLocation)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  var size = 2
  var type = gl.FLOAT
  var normalized = false
  var stride = 0
  var offset = 0
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalized, stride, offset)

  // 绘制图形
  var primitiveType = gl.TRIANGLES
  var offset = 0
  var count = 3
  gl.drawArrays(primitiveType, offset, count)

}

var main =  function() {
  setGeometry(gl)
  drawScene(gl)
}

main()


