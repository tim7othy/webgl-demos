var canvas = document.getElementById("gl-canvas")
var gl = canvas.getContext("webgl")

if(!gl) {
  throw new Error("Do not support webgl")
}

var getVertexShaderSource = function() {
  return `
    attribute vec2 a_position;
    attribute vec4 a_color;

    uniform vec2 u_resolution;

    varying vec4 v_color;

    void main() {
      vec2 zeroToOne = a_position / u_resolution;

      vec2 zeroToTwo = zeroToOne * 2.0;

      vec2 clipSpace = zeroToTwo - 1.0;

      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_color = a_color;
    }
  `
}

var getFragmentShaderSource = function() {
  return `
    precision mediump float;

    varying vec4 v_color;

    void main() {
      gl_FragColor = v_color;
    }
  `
}

var createShader = function(gl, type, source) {
  var shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!success) {
    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    shader = null
  }
  return shader
}

var createProgram = function(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  var success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!success) {
    console.log(gl.getProgramLogIngo(program))
    gl.deleteProgram(program)
    program = null
  }
  return program
}

var vertexShader = createShader(gl, gl.VERTEX_SHADER, getVertexShaderSource())
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, getFragmentShaderSource())
var program = createProgram(gl, vertexShader, fragmentShader)

var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
var colorAttributeLocation = gl.getAttribLocation(program, "a_color")
var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")

var setGeometry = function(gl) {
  var positions = [
    0, -100,
    150, 125,
    -175, 100
  ]
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
}

var setColor = function(gl) {
  var r1 = Math.random() * 256
  var g1 = Math.random() * 256
  var b1 = Math.random() * 256
  var r2 = Math.random() * 256
  var g2 = Math.random() * 256
  var b2 = Math.random() * 256
  var r3 = Math.random() * 256
  var g3 = Math.random() * 256
  var b3 = Math.random() * 256
  var colors = [
    r1, g1, b1, 255,
    r2, g2, b2, 255,
    r3, g3, b3, 255
  ]
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW)
}

var positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
setGeometry(gl)

var colorBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
setColor(gl)


var drawScene = function(gl) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)

  // 设置顶点属性即缓冲区
  gl.enableVertexAttribArray(positionAttributeLocation)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  var size = 2
  var type = gl.FLOAT
  var normalized = false
  var stride = 0
  var offset = 0
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalized, stride, offset)

  // 设置颜色属性及缓冲区
  gl.enableVertexAttribArray(colorAttributeLocation)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)

  var size = 4
  var type = gl.UNSIGNED_BYTE
  var normalized = true
  var stride = 0
  var offset = 0
  gl.vertexAttribPointer(colorAttributeLocation, size, type, normalized, stride, offset)

  gl.uniform2f(resolutionUniformLocation, 400, 300)

  // 绘制图形
  var primitiveType = gl.TRIANGLES
  var offset = 0
  var count = 3
  gl.drawArrays(primitiveType, offset, count)

}

var main =  function() {
  drawScene(gl)
}

main()


