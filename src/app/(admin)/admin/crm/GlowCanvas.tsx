"use client";

import { useEffect, useRef } from "react";

// Luz ambiente violeta em WebGL atrás do board inteiro — um unico shader leve
// (~30fps, 1 pixel de device, so enquanto a tela estiver visivel). Se o
// navegador nao suportar WebGL ou a pessoa pediu "reduzir movimento", some
// e o CSS (fundo com gradiente fixo) resolve sozinho.
const NOISE = `precision highp float;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+17.;a*=.5;}return s;}
`;

const FRAG = `uniform vec2 R;uniform float T;uniform vec2 M;
void main(){
  vec2 uv = gl_FragCoord.xy / R;
  vec2 p = vec2((uv.x - .5) * R.x / R.y, uv.y - .08);
  float fog = fbm(p * 1.3 + vec2(T * .02, -T * .03));
  vec2 d1 = p - vec2((M.x - .5) * .5, .18);
  vec2 d2 = p - vec2(.4 + .08 * sin(T * .09), .55);
  float g1 = exp(-dot(d1, d1) * 2.4) * (.6 + .5 * fog);
  float g2 = exp(-dot(d2, d2) * 3.1) * (.5 + .4 * fog);
  vec3 col = vec3(.32, .26, 1.) * g1 * 1.1 + vec3(.55, .3, .95) * g2 * .85;
  col = 1. - exp(-col * 1.25);
  col += (h21(p * R + fract(T) * 71.) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}`;

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GlowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, NOISE + FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "R");
    const uT = gl.getUniformLocation(prog, "T");
    const uM = gl.getUniformLocation(prog, "M");

    let W = 0, H = 0, mx = 0.5, tx = 0.5, visible = false, raf = 0, last = 0;
    const FRAME = 1000 / 30 - 3;

    const size = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = parent.clientWidth;
      H = parent.clientHeight;
      const s = Math.min(window.devicePixelRatio || 1, 1);
      canvas.width = W * s;
      canvas.height = H * s;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    size();
    const ro = new ResizeObserver(size);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const io = new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; }));
    io.observe(canvas);

    const onMove = (e: PointerEvent) => { tx = e.clientX / window.innerWidth; };
    window.addEventListener("pointermove", onMove, { passive: true });

    const draw = (t: number) => {
      mx += (tx - mx) * 0.05;
      gl.uniform2f(uR, W, H);
      gl.uniform1f(uT, t);
      gl.uniform2f(uM, mx, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (REDUCED) {
      draw(0);
    } else {
      const frame = (t: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || t - last < FRAME) return;
        last = t;
        draw(t / 1000);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="crm-glow" aria-hidden="true" />;
}
