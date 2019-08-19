(function() {
  var glUtils = {}
  glUtils.createShader = function(gl, type, source) {
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

  glUtils.createProgram = function(gl, vertexShader, fragmentShader) {
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

  glUtils.initProgram = function(gl, vertexShaderSource, fragmentShaderSource) {
    var vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    var fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    var program = glUtils.createProgram(gl, vertexShader, fragmentShader)
    return program
  }

  window.glUtils = glUtils
}())

