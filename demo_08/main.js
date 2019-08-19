(function() {
  var canvas = document.getElementById("gl-canvas")
  var gl = canvas.getContext("webgl")

  if(!gl) {
    throw new Error("Do not support webgl")
  }

  var getVertexShaderSource = function() {
    return `
      attribute vec4 a_position;
      
      attribute vec3 a_normal;
      varying vec3 v_normal;

      uniform mat4 u_world;
      uniform mat4 u_worldInverseTranspose;
      uniform mat4 u_worldViewProjection;

      uniform vec3 u_worldLightPosition;
      uniform vec3 u_worldCameraPosition;
      varying vec3 v_surfaceToLight;
      varying vec3 v_surfaceToCamera;

      void main() {
        gl_Position = u_worldViewProjection * a_position;
        v_normal = mat3(u_worldInverseTranspose) * a_normal;
        vec3 transformedSurfacePosition = (u_world * a_position).xyz;
        v_surfaceToLight = u_worldLightPosition - transformedSurfacePosition;
        v_surfaceToCamera = u_worldCameraPosition - transformedSurfacePosition;
      }
    `
  }

  var getFragmentShaderSource = function() {
    return `
      precision mediump float;

      varying vec3 v_normal;
      varying vec3 v_surfaceToLight;
      varying vec3 v_surfaceToCamera;

      uniform vec4 u_color;
      uniform float u_shininess;

      void main() {
        vec3 normal = normalize(v_normal);
        vec3 surfaceToLight = normalize(v_surfaceToLight);
        vec3 surfaceToCamera = normalize(v_surfaceToCamera);
        vec3 halfVec = normalize(surfaceToLight + surfaceToCamera);
        float light = dot(normal, surfaceToLight);
        float highLight = 0.0;
        if (light > 0.0) {
          highLight = pow(dot(normal, halfVec), u_shininess);
        }
        gl_FragColor = u_color;
        gl_FragColor.rgb *= light;
        gl_FragColor.rgb += highLight;
      }
    `
  }

  var m4 = {
    translation: function(tx, ty, tz) {
      return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
      ];
    },

    rotationX: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
      return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
      ];
    },

    rotationY: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
      return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
      ];
    },

    rotationZ: function(angleInRadians) {
      var c = Math.cos(angleInRadians);
      var s = Math.sin(angleInRadians);
      return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    },

    scaling: function(sx, sy, sz) {
      return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
      ];
    },

    projection: function(width, height, depth) {
      // 注意：这个矩阵翻转了 Y 轴，所以 0 在上方
      return [
        2 / width, 0, 0, 0,
        0, -2 / height, 0, 0,
        0, 0, 2 / depth, 0,
        -1, 1, 0, 1
      ];
    },

    perspective: function(filedOfView, aspect, zNear, zFar) {
      var d = Math.tan(Math.PI * 0.5 - filedOfView * 0.5)
      var rangeInv = 1.0 / (zNear - zFar)
      var A = (zNear + zFar) * rangeInv
      var B = 2 * zNear * zFar * rangeInv
      return [
        d / aspect, 0, 0, 0,
        0, d, 0, 0,
        0, 0, A, -1,
        0, 0, B, 0
      ]
    },

    multiply: function(a, b) {
      var a00 = a[0 * 4 + 0];
      var a01 = a[0 * 4 + 1];
      var a02 = a[0 * 4 + 2];
      var a03 = a[0 * 4 + 3];
      var a10 = a[1 * 4 + 0];
      var a11 = a[1 * 4 + 1];
      var a12 = a[1 * 4 + 2];
      var a13 = a[1 * 4 + 3];
      var a20 = a[2 * 4 + 0];
      var a21 = a[2 * 4 + 1];
      var a22 = a[2 * 4 + 2];
      var a23 = a[2 * 4 + 3];
      var a30 = a[3 * 4 + 0];
      var a31 = a[3 * 4 + 1];
      var a32 = a[3 * 4 + 2];
      var a33 = a[3 * 4 + 3];
      var b00 = b[0 * 4 + 0];
      var b01 = b[0 * 4 + 1];
      var b02 = b[0 * 4 + 2];
      var b03 = b[0 * 4 + 3];
      var b10 = b[1 * 4 + 0];
      var b11 = b[1 * 4 + 1];
      var b12 = b[1 * 4 + 2];
      var b13 = b[1 * 4 + 3];
      var b20 = b[2 * 4 + 0];
      var b21 = b[2 * 4 + 1];
      var b22 = b[2 * 4 + 2];
      var b23 = b[2 * 4 + 3];
      var b30 = b[3 * 4 + 0];
      var b31 = b[3 * 4 + 1];
      var b32 = b[3 * 4 + 2];
      var b33 = b[3 * 4 + 3];
      // 下面看似是实现了b * a，但实际上之前我们一直使用的以列方式存储矩阵
      // 因此矩阵a和b中行和列实际上是倒置的
      // 这里实际上求的是 a * b
      return [
        b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
        b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
        b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
        b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
        b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
        b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
        b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
        b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
        b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
        b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
        b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
        b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
        b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
        b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
        b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
        b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
      ];
    },

    translate: function(m, tx, ty, tz) {
      return m4.multiply(m, m4.translation(tx, ty, tz));
    },

    rotateX: function(m, angleInRadians) {
      return m4.multiply(m, m4.rotationX(angleInRadians));
    },

    rotateY: function(m, angleInRadians) {
      return m4.multiply(m, m4.rotationY(angleInRadians));
    },

    rotateZ: function(m, angleInRadians) {
      return m4.multiply(m, m4.rotationZ(angleInRadians));
    },

    scale: function(m, sx, sy, sz) {
      return m4.multiply(m, m4.scaling(sx, sy, sz));
    },

    inverse: function(m) {
      var m00 = m[0 * 4 + 0];
      var m01 = m[0 * 4 + 1];
      var m02 = m[0 * 4 + 2];
      var m03 = m[0 * 4 + 3];
      var m10 = m[1 * 4 + 0];
      var m11 = m[1 * 4 + 1];
      var m12 = m[1 * 4 + 2];
      var m13 = m[1 * 4 + 3];
      var m20 = m[2 * 4 + 0];
      var m21 = m[2 * 4 + 1];
      var m22 = m[2 * 4 + 2];
      var m23 = m[2 * 4 + 3];
      var m30 = m[3 * 4 + 0];
      var m31 = m[3 * 4 + 1];
      var m32 = m[3 * 4 + 2];
      var m33 = m[3 * 4 + 3];
      var tmp_0  = m22 * m33;
      var tmp_1  = m32 * m23;
      var tmp_2  = m12 * m33;
      var tmp_3  = m32 * m13;
      var tmp_4  = m12 * m23;
      var tmp_5  = m22 * m13;
      var tmp_6  = m02 * m33;
      var tmp_7  = m32 * m03;
      var tmp_8  = m02 * m23;
      var tmp_9  = m22 * m03;
      var tmp_10 = m02 * m13;
      var tmp_11 = m12 * m03;
      var tmp_12 = m20 * m31;
      var tmp_13 = m30 * m21;
      var tmp_14 = m10 * m31;
      var tmp_15 = m30 * m11;
      var tmp_16 = m10 * m21;
      var tmp_17 = m20 * m11;
      var tmp_18 = m00 * m31;
      var tmp_19 = m30 * m01;
      var tmp_20 = m00 * m21;
      var tmp_21 = m20 * m01;
      var tmp_22 = m00 * m11;
      var tmp_23 = m10 * m01;

      var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
          (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
      var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
          (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
      var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
          (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
      var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
          (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

      var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

      return [
        d * t0,
        d * t1,
        d * t2,
        d * t3,
        d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
              (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
        d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
              (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
        d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
              (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
        d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
              (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
        d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
              (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
        d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
              (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
        d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
              (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
        d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
              (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
        d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
              (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
        d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
              (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
        d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
              (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
        d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
              (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
      ];
    },

    transpose: function(m) {
      return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15],
      ];
    },

    subtractVectors: function(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    },

    normalize: function(v) {
      var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      // make sure we don't divide by 0.
      if (length > 0.00001) {
        return [v[0] / length, v[1] / length, v[2] / length];
      } else {
        return [0, 0, 0];
      }
    },

    cross: function(a, b) {
      return [a[1] * b[2] - a[2] * b[1],
              a[2] * b[0] - a[0] * b[2],
              a[0] * b[1] - a[1] * b[0]];
    },

    dotVectors: function(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    },

    lookAt: function(cameraPosition, target, up) {
      var cameraPositionReverse = this.subtractVectors([0,0,0], cameraPosition)
      var eyeReverse = this.subtractVectors(cameraPosition, target)
      var zAxis = this.normalize(eyeReverse)
      var xAxis = this.normalize(this.cross(up, zAxis))
      var yAxis = this.normalize(this.cross(zAxis, xAxis))
      return [
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,
        this.dotVectors(xAxis, cameraPositionReverse),
        this.dotVectors(yAxis, cameraPositionReverse),
        this.dotVectors(zAxis, cameraPositionReverse),
        1
      ]
    },

    transformPoint: function(m, v, dst) {
      dst = dst || new Float32Array(3);
      var v0 = v[0];
      var v1 = v[1];
      var v2 = v[2];
      var d = v0 * m[0 * 4 + 3] + v1 * m[1 * 4 + 3] + v2 * m[2 * 4 + 3] + m[3 * 4 + 3];

      dst[0] = (v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0] + m[3 * 4 + 0]) / d;
      dst[1] = (v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1] + m[3 * 4 + 1]) / d;
      dst[2] = (v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2] + m[3 * 4 + 2]) / d;

      return dst;
    }


  }

  // 编译、链接顶点着色器和片段着色器
  var program = glUtils.initProgram(gl, getVertexShaderSource(), getFragmentShaderSource())

  // 从着色程序中获取属性以及全局变量在内存中的位置，以便于对它们赋值
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
  var normalAttributeLocation = gl.getAttribLocation(program, "a_normal")
  // var colorAttributeLocation = gl.getAttribLocation(program, "a_color")
  var worldUniformLocation = gl.getUniformLocation(program, "u_world")
  var worldInverseTransposeUniformLocation = gl.getUniformLocation(program, "u_worldInverseTranspose")
  var worldViewProjectionUniformLocation = gl.getUniformLocation(program, "u_worldViewProjection")
  // var reversedLightDirectionUniformLocation = gl.getUniformLocation(program, "u_reversedLightDirection")
  var worldLightPositionUniformLocation = gl.getUniformLocation(program, "u_worldLightPosition")
  var worldCameraPositionUniformLocaiton = gl.getUniformLocation(program, "u_worldCameraPostion")
  var colorUniformLocation = gl.getUniformLocation(program, "u_color")
  var shininessUniformLocation = gl.getUniformLocation(program, "u_shininess")


  // 创建存储数据的缓冲区,之后如果需要使用,使用gl.bindBuffer绑定即可
  var positionBuffer = gl.createBuffer()
  // var colorBuffer = gl.createBuffer()
  var normalBuffer = gl.createBuffer()

  var setGeometry = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    var positions = new Float32Array([
          // left column front
          0,   0,  0,
          0, 150,  0,
          30,   0,  0,
          0, 150,  0,
          30, 150,  0,
          30,   0,  0,

          // top rung front
          30,   0,  0,
          30,  30,  0,
          100,   0,  0,
          30,  30,  0,
          100,  30,  0,
          100,   0,  0,

          // middle rung front
          30,  60,  0,
          30,  90,  0,
          67,  60,  0,
          30,  90,  0,
          67,  90,  0,
          67,  60,  0,

          // left column back
            0,   0,  30,
           30,   0,  30,
            0, 150,  30,
            0, 150,  30,
           30,   0,  30,
           30, 150,  30,

          // top rung back
           30,   0,  30,
          100,   0,  30,
           30,  30,  30,
           30,  30,  30,
          100,   0,  30,
          100,  30,  30,

          // middle rung back
           30,  60,  30,
           67,  60,  30,
           30,  90,  30,
           30,  90,  30,
           67,  60,  30,
           67,  90,  30,

          // top
            0,   0,   0,
          100,   0,   0,
          100,   0,  30,
            0,   0,   0,
          100,   0,  30,
            0,   0,  30,

          // top rung right
          100,   0,   0,
          100,  30,   0,
          100,  30,  30,
          100,   0,   0,
          100,  30,  30,
          100,   0,  30,

          // under top rung
          30,   30,   0,
          30,   30,  30,
          100,  30,  30,
          30,   30,   0,
          100,  30,  30,
          100,  30,   0,

          // between top rung and middle
          30,   30,   0,
          30,   60,  30,
          30,   30,  30,
          30,   30,   0,
          30,   60,   0,
          30,   60,  30,

          // top of middle rung
          30,   60,   0,
          67,   60,  30,
          30,   60,  30,
          30,   60,   0,
          67,   60,   0,
          67,   60,  30,

          // right of middle rung
          67,   60,   0,
          67,   90,  30,
          67,   60,  30,
          67,   60,   0,
          67,   90,   0,
          67,   90,  30,

          // bottom of middle rung.
          30,   90,   0,
          30,   90,  30,
          67,   90,  30,
          30,   90,   0,
          67,   90,  30,
          67,   90,   0,

          // right of bottom
          30,   90,   0,
          30,  150,  30,
          30,   90,  30,
          30,   90,   0,
          30,  150,   0,
          30,  150,  30,

          // bottom
          0,   150,   0,
          0,   150,  30,
          30,  150,  30,
          0,   150,   0,
          30,  150,  30,
          30,  150,   0,

          // left side
          0,   0,   0,
          0,   0,  30,
          0, 150,  30,
          0,   0,   0,
          0, 150,  30,
          0, 150,   0])
    var matrix = m4.rotationX(Math.PI);
    matrix = m4.translate(matrix, -50, -75, -15);

    for (var ii = 0; ii < positions.length; ii += 3) {
      var vector = m4.transformPoint(matrix, [positions[ii + 0], positions[ii + 1], positions[ii + 2], 1]);
      positions[ii + 0] = vector[0];
      positions[ii + 1] = vector[1];
      positions[ii + 2] = vector[2];
    }

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  }

  // var setColor = function(gl) {
  //   gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  //   gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([
  //       // left column front
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,

  //       // top rung front
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,

  //         // middle rung front
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,
  //       200,  70, 120,

  //         // left column back
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,

  //         // top rung back
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,

  //         // middle rung back
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,
  //       80, 70, 200,

  //         // top
  //       70, 200, 210,
  //       70, 200, 210,
  //       70, 200, 210,
  //       70, 200, 210,
  //       70, 200, 210,
  //       70, 200, 210,

  //         // top rung right
  //       200, 200, 70,
  //       200, 200, 70,
  //       200, 200, 70,
  //       200, 200, 70,
  //       200, 200, 70,
  //       200, 200, 70,

  //         // under top rung
  //       210, 100, 70,
  //       210, 100, 70,
  //       210, 100, 70,
  //       210, 100, 70,
  //       210, 100, 70,
  //       210, 100, 70,

  //         // between top rung and middle
  //       210, 160, 70,
  //       210, 160, 70,
  //       210, 160, 70,
  //       210, 160, 70,
  //       210, 160, 70,
  //       210, 160, 70,

  //         // top of middle rung
  //       70, 180, 210,
  //       70, 180, 210,
  //       70, 180, 210,
  //       70, 180, 210,
  //       70, 180, 210,
  //       70, 180, 210,

  //         // right of middle rung
  //       100, 70, 210,
  //       100, 70, 210,
  //       100, 70, 210,
  //       100, 70, 210,
  //       100, 70, 210,
  //       100, 70, 210,

  //         // bottom of middle rung.
  //       76, 210, 100,
  //       76, 210, 100,
  //       76, 210, 100,
  //       76, 210, 100,
  //       76, 210, 100,
  //       76, 210, 100,

  //         // right of bottom
  //       140, 210, 80,
  //       140, 210, 80,
  //       140, 210, 80,
  //       140, 210, 80,
  //       140, 210, 80,
  //       140, 210, 80,

  //         // bottom
  //       90, 130, 110,
  //       90, 130, 110,
  //       90, 130, 110,
  //       90, 130, 110,
  //       90, 130, 110,
  //       90, 130, 110,

  //         // left side
  //       160, 160, 220,
  //       160, 160, 220,
  //       160, 160, 220,
  //       160, 160, 220,
  //       160, 160, 220,
  //       160, 160, 220
  //   ]), gl.STATIC_DRAW)
  // }

  var setNormal = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          // left column front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,

          // top rung front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,

          // middle rung front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,

          // left column back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,

          // top rung back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,

          // middle rung back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,

          // top
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,

          // top rung right
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,

          // under top rung
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,

          // between top rung and middle
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,

          // top of middle rung
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,

          // right of middle rung
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,

          // bottom of middle rung.
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,

          // right of bottom
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,

          // bottom
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,

          // left side
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0
    ]), gl.STATIC_DRAW)
  }

  var drawScene = function(gl, scale, angleInRadians, translation, cameraAngleRadians) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.useProgram(program)

    // 设置所有全局变量

    // 设置顶点属性及缓冲区
    gl.enableVertexAttribArray(positionAttributeLocation)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // 告诉属性如何读取顶点缓冲区中的数据
    var size = 3
    var type = gl.FLOAT
    var normalized = false
    var stride = 0
    var offset = 0
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalized, stride, offset)

    // 设置顶点属性及缓冲区
    gl.enableVertexAttribArray(normalAttributeLocation)
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)

    // 告诉属性如何读取法向量缓冲区中的数据
    var size = 3
    var type = gl.FLOAT
    var normalized = false
    var stride = 0
    var offset = 0
    gl.vertexAttribPointer(normalAttributeLocation, size, type, normalized, stride, offset)

    // // 设置颜色属性及相关缓冲区
    // gl.enableVertexAttribArray(colorAttributeLocation)
    // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)

    // // 告诉属性如何读取颜色缓冲区中的数据
    // var size = 3
    // var type = gl.UNSIGNED_BYTE
    // var normalized = true
    // var stride = 0
    // var offset = 0
    // gl.vertexAttribPointer(colorAttributeLocation, size, type, normalized, stride, offset)

    // 计算所有变换矩阵
    // var projectionMatrix = m4.projection(gl.canvas.width, gl.canvas.height, 400);
    // 投影变换
    var filedOfView = 60 * Math.PI / 180
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
    var zNear = 1
    var zFar = 2000
    var projectionMatrix = m4.perspective(filedOfView, aspect, zNear, zFar)

    // // 组合相机变换矩阵
    var radius = 200
    var cameraMatrix = m4.rotationY(cameraAngleRadians)
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, radius * 1.5)

    // 获得矩阵中相机的位置
    var cameraPosition = [
      cameraMatrix[12],
      cameraMatrix[13],
      cameraMatrix[14],
    ];

    var target = [radius, 0, 0]
    var up = [0, 1, 0]
    var viewMatrix = m4.lookAt(cameraPosition, target, up)
    // 组合投影变换矩阵和视图变换矩阵
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix)



    // 矩阵相乘
    // 计算 projection * view * translation * rotation * scaling * position
    var matrix = m4.translation(translation[0], translation[1], translation[2])
    matrix = m4.rotateX(matrix, angleInRadians[0]);
    matrix = m4.rotateY(matrix, angleInRadians[1]);
    matrix = m4.rotateZ(matrix, angleInRadians[2]);
    // matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

    // 世界坐标系上的坐标的变换矩阵
    var worldMatrix = matrix
    // 透视投影、视角变换以及旋转、平移等变换之后的综合变换矩阵
    var worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix)

    // 求逆矩阵的转置矩阵以消除scale之后的变换矩阵会让法向量形变
    var worldInverseMatrix = m4.inverse(worldMatrix);
    var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    // 设置矩阵
    gl.uniformMatrix4fv(worldUniformLocation, false, worldMatrix);
    gl.uniformMatrix4fv(worldInverseTransposeUniformLocation, false, worldInverseTransposeMatrix);
    gl.uniformMatrix4fv(worldViewProjectionUniformLocation, false, worldViewProjectionMatrix);

    // Set the color to use
    gl.uniform4fv(colorUniformLocation, [0.2, 1, 0.2, 1]); // green

    // set the light direction.
    // gl.uniform3fv(reversedLightDirectionUniformLocation, m4.normalize([0.5, 0.7, 1]));

    // 设置点光源
    gl.uniform3fv(worldLightPositionUniformLocation, [100, 30, -250])

    // 设置相机位置
    gl.uniform3fv(worldCameraPositionUniformLocaiton, cameraPosition)

    // 设置高光反射的幂指数
    gl.uniform1f(shininessUniformLocation, 5.0)

  
    // 获得几何体
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 16 * 6;
    gl.drawArrays(primitiveType, offset, count);

  }

  var main =  function() {
    setGeometry(gl)
    // setColor(gl)
    setNormal(gl)
    var scale = [1, 1, 1]
    var theta = 0
    var radius = 0
    var angleInRadians = [0, 0, 0]
    var cameraAngleRadians = 0
    var translation = [100, 0, -300]
    setInterval(function() {
      drawScene(gl, scale, angleInRadians, translation, cameraAngleRadians)
      // scale[0] += 0.1
      // scale[1] += 0.1
      // translation[0] += 5
      // translation[1] += 3
      // translation[2] += 1 
      theta += 1
      radius = theta / 180 * Math.PI
      angleInRadians = [0, radius, 0]
      // cameraAngleRadians = radius
    }, 30)
  }

  main()

}())