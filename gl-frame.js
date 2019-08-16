var canvas = document.getElementById("gl-canvas")
var gl = canvas.getContext("webgl")

if(!gl) {
  throw new Error("Do not support webgl")
}

var vertexShaderSource = `
  attribute vec2 a_position;

  uniform vec2 u_resolution;

  void main() {
    vec2 zeroToOne = a_position / u_resolution;

    vec2 zeroToTwo = zeroToOne * 2.0;

    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`

var fragmentShaderSource = `
  precision mediump float;

  void main() {
    gl_FragColor = vec4(1, 0, 0.5, 0.5);
  }
`

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

var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

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

var program = createProgram(gl, vertexShader, fragmentShader)

var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")

var positionBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

var positions = [
  10, 20,
  80, 20,
  10, 30,
  10, 30,
  80, 20,
  80, 30,
]
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

gl.clearColor(0, 0, 0, 0)
gl.clear(gl.COLOR_BUFFER_BIT)

gl.useProgram(program)

gl.enableVertexAttribArray(positionAttributeLocation)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

gl.uniform2f(resolutionUniformLocation, 400, 300)

var size = 2
var type = gl.FLOAT
var normalized = false
var stride = 0
var offset = 0
gl.vertexAttribPointer(positionAttributeLocation, size, type, normalized, stride, offset)

var primitiveType = gl.TRIANGLES
var offset = 0
var count = 6
gl.drawArrays(primitiveType, offset, count)




