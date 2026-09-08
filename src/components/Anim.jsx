import { useRef, useEffect } from 'react'

/* ---------------- static image constants ---------------- */
const L = 32                 // retained DCT modes per axis
const H = 50, W = 50       // output resolution
const C = 3                  // RGB
const KSQ = L * L            // 1 024 coefficients per channel block

/* ---------------- cosine tables (shared) ---------------- */
const cosU = Array.from({ length: W }, (_, x) =>
	new Float32Array(L).map((_, u) =>
		Math.cos(((2 * x + 1) * u * Math.PI) / (2 * W))))
const cosV = Array.from({ length: H }, (_, y) =>
	new Float32Array(L).map((_, v) =>
		Math.cos(((2 * y + 1) * v * Math.PI) / (2 * H))))

/* ========== GPU singletons (created after we know the file size) ========== */
let gpuReady = null
let device, pipe, bind, coeffBuf, cosUBuf, cosVBuf, outBuf, stagingBuf
let T = 0                           // (# frames) discovered at runtime
let bytesAll = 0                    // total float bytes (H·W·C·T·4)

async function initGPU(frameCount) {
	if (gpuReady) return gpuReady
	gpuReady = (async () => {
		if (!navigator.gpu) return null
		const adapter = await navigator.gpu.requestAdapter()
		if (!adapter) return null
		// Actual peak usage: outBuf = T*H*W*C*4 ≈ 15 MB. 32 MB gives ~2× slack.
		const MB32 = 32 * 1024 * 1024
		device = await adapter.requestDevice({
			requiredLimits: {
				maxStorageBufferBindingSize: MB32,
				maxBufferSize: MB32,
			},
		})

		/* ---------- buffers ---------- */
		const makeCosBuf = flat => {
			const b = device.createBuffer({
				size: flat.byteLength,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
				mappedAtCreation: true,
			})
			new Float32Array(b.getMappedRange()).set(flat)
			b.unmap()
			return b
		}
		cosUBuf = makeCosBuf(
			Float32Array.from({ length: W * L }, (_, i) => cosU[i / L | 0][i % L]),
		)
		cosVBuf = makeCosBuf(
			Float32Array.from({ length: H * L }, (_, i) => cosV[i / L | 0][i % L]),
		)

		coeffBuf = device.createBuffer({
			size: frameCount * C * KSQ * 4,                // f32 coeffs
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		})
		bytesAll = frameCount * H * W * C * 4            // decoded floats
		outBuf = device.createBuffer({
			size: bytesAll,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
		})
		stagingBuf = device.createBuffer({
			size: bytesAll,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		})

		/* ---------- WGSL shader (parametrised by frameCount) ---------- */
		const mod = device.createShaderModule({
			code: `
        struct Mat{data:array<f32>};
        @group(0) @binding(0) var<storage,read>        coeff : Mat;
        @group(0) @binding(1) var<storage,read>        cosU  : Mat;
        @group(0) @binding(2) var<storage,read>        cosV  : Mat;
        @group(0) @binding(3) var<storage,read_write>  outF  : array<f32>;

        const W:u32=${W}; const H:u32=${H}; const L:u32=${L}; const F:u32=${frameCount}; const C:u32=${C};
        const KSQ:u32=${KSQ};

        @compute @workgroup_size(16,16,1)
        fn main(@builtin(global_invocation_id) gid:vec3<u32>) {
          let x=gid.x; let y=gid.y; let bc=gid.z;           // block-channel index
          if (x>=W || y>=H) { return; }

          let frame = bc / C;                       // 0..F-1
          let chan  = bc % C;                       // 0,1,2

          var sum:f32 = 0.0;
          for (var v:u32=0; v<L; v++){
            let cv = cosV.data[y*L+v];
            for (var u:u32=0; u<L; u++){
              let cu = cosU.data[x*L+u];
              sum += coeff.data[bc*KSQ + v*L + u] * cu * cv;
            }
          }
          sum = clamp(sum,0.0,255.0);
          let idx = ((frame*H + y)*W + x)*C + chan;
          outF[idx] = sum;
        }`,
		})
		pipe = device.createComputePipeline({
			layout: 'auto',
			compute: { module: mod, entryPoint: 'main' },
		})
		bind = device.createBindGroup({
			layout: pipe.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: coeffBuf } },
				{ binding: 1, resource: { buffer: cosUBuf } },
				{ binding: 2, resource: { buffer: cosVBuf } },
				{ binding: 3, resource: { buffer: outBuf } },
			],
		})
		return null
	})()
	return gpuReady
}

/* ---------- run ONE dispatch that decodes ALL blocks ---------- */
async function gpuDecodeAll(coeffF32) {
	if (!device) return null;                 // GPU not available

	/* upload the whole coefficient tensor */
	device.queue.writeBuffer(coeffBuf, 0, coeffF32);

	/* encode and submit the compute+copy work */
	const enc  = device.createCommandEncoder();
	const pass = enc.beginComputePass();
	pass.setPipeline(pipe);
	pass.setBindGroup(0, bind);
	pass.dispatchWorkgroups(Math.ceil(W / 16), Math.ceil(H / 16), T * C);
	pass.end();
	enc.copyBufferToBuffer(outBuf, 0, stagingBuf, 0, bytesAll);
	device.queue.submit([enc.finish()]);
	await device.queue.onSubmittedWorkDone();

	/* map the staging buffer and return a copy */
	await stagingBuf.mapAsync(GPUMapMode.READ);
	const result = new Float32Array(stagingBuf.getMappedRange()).slice();
	stagingBuf.unmap();
	return result;                            // length = H·W·C·T floats
}


/* ========== pure-CPU fallback for one frame ========== */
function cpuDecodeFrame(frame16) {
	const out = new Float32Array(H * W * C)
	for (let ch = 0; ch < C; ch++) {
		const blk = new Float32Array(frame16.subarray(ch * KSQ, (ch + 1) * KSQ))
		const tmp = new Float32Array(L * W)
		for (let v = 0; v < L; v++)
			for (let x = 0; x < W; x++) {
			let s = 0, cu = cosU[x]
			for (let u = 0; u < L; u++) s += blk[v * L + u] * cu[u]
			tmp[v * W + x] = s
		}
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
			let s = 0, cv = cosV[y]
			for (let v = 0; v < L; v++) s += tmp[v * W + x] * cv[v]
			out[(y * W + x) * C + ch] = s
		}
	}
	return out
}

/* ========== main loader (memoised) ========== */

let loadPromise = null
export function loadAnimData() {
	if (loadPromise) return loadPromise
	loadPromise = (async () => {
		const url = '/assets/anim.bin'
		const bin16 = new Float16Array(await (await fetch(url)).arrayBuffer());
		const blocks   = bin16.length / KSQ;
		T = blocks / C;
		if (!Number.isInteger(T)) throw new Error('corrupt file size')

		/* ---- try GPU path ---- */
		try { await initGPU(T) } catch { /* GPU unavailable, fall through to CPU */ }
		const coeff32 = Float32Array.from(bin16);
		let floats  = await gpuDecodeAll(coeff32)
		if (!floats) {
			floats = new Float32Array(H * W * C * T)
			for (let f = 0; f < T; f++) {
				const frame16 = bin16.subarray(f * C * KSQ, (f + 1) * C * KSQ)
				floats.set(cpuDecodeFrame(frame16), f * H * W * C)
			}
		}

		const bytes = new Uint8ClampedArray(floats.length);
		for (let i = 0; i < floats.length; i++) bytes[i] = floats[i] & 255;

		return { bytes, frameCount: T }
	})()
	return loadPromise
}

/* =================================================================== */
/*                     React component (render loop)                    */
/* =================================================================== */

const TARGET_FPS  = 20;
const FRAME_TIME  = 1000 / TARGET_FPS; // 50 ms

/* ---------------------------------------------------------------------------
 * Module-scope render engine — a session singleton. The mousemove listener and
 * the rAF loop are created at most once, no matter how many times <Anim>
 * mounts (React StrictMode / dev double-invoke, hydration re-mounts,
 * view-transition remounts). The loop draws to whichever canvas is currently
 * mounted (`engineCanvas`) and parks itself when there is none.
 *
 * Fade progress (`_fade`) and playback position (`_savedFrame`) live here so a
 * re-mount resumes rather than replaying the fade. The fade advances by the
 * delta between *painted* frames (`prevTS`), which starts unset so the very
 * first painted frame always uses dt = 0 and draws at the current `_fade`
 * (0 on a cold load) — a clean start from the gray placeholder instead of the
 * one-frame full-brightness flash the old promise-resolution clock produced.
 * ------------------------------------------------------------------------- */
let _savedFrame  = 0;
let _fade        = 0;           // 0..1, monotonic
let _speed       = 1;
let _mouseX = null, _mouseY = null, _mouseTS = 0;
let engineInit   = false;
let engineCanvas = null;        // the <canvas> currently on screen, or null
let resumeLoop   = () => {};    // replaced once anim data has loaded

function onMouseMove(e) {
	const now = performance.now();
	if (_mouseX !== null) {
		const vel = Math.hypot(e.clientX - _mouseX, e.clientY - _mouseY) /
			((now - _mouseTS) / 1000 || 1);
		_speed = 1 + Math.min(vel / 100, 10);
	}
	_mouseX = e.clientX; _mouseY = e.clientY; _mouseTS = now;
}

function initEngine() {
	if (engineInit) return;
	engineInit = true;

	document.addEventListener('mousemove', onMouseMove);

	/* off-screen canvas for the interpolated frame */
	const offCvs = document.createElement('canvas');
	offCvs.width = W; offCvs.height = H;
	const offCtx = offCvs.getContext('2d');
	const frameSize = W * H * C;
	const rowStride = W * C;

	loadAnimData().then(({ bytes, frameCount }) => {
		const img = offCtx.createImageData(W, H);
		let prevTS = 0;        // 0 => first painted frame; set from `ts` so dt = 0
		let nextDue = 0;
		let running = false;

		function loop(ts) {
			const cvs = engineCanvas;
			if (!cvs) { running = false; return; }   // parked; resumeLoop() restarts it

			if (ts >= nextDue) {
				nextDue = ts + FRAME_TIME;

				const dt = Math.min(ts - prevTS, FRAME_TIME * 2)
				prevTS = ts;

				if (_mouseTS && ts - _mouseTS > 100) _speed = 1;
				_savedFrame = (_savedFrame + dt * 0.005 * _speed) % frameCount;

				const i0 = _savedFrame | 0;
				const i1 = (i0 + 1) % frameCount;
				const a  = _savedFrame - i0;

				for (let y = 0; y < H; ++y) {
					for (let x = 0; x < W; ++x) {
						const s0 = i0 * frameSize + y * rowStride + x * C;
						const s1 = i1 * frameSize + y * rowStride + x * C;
						const d  = (y * W + x) * 4;
						for (let c = 0; c < 3; ++c)
							img.data[d + c] = bytes[s0 + c] * (1 - a) + bytes[s1 + c] * a;
						img.data[d + 3] = 255;
					}
				}
				offCtx.putImageData(img, 0, 0);

				if (_fade < 1) _fade = Math.min(1, _fade + 0.3 * dt * 0.005);

				const ctx = cvs.getContext('2d');
				ctx.clearRect(0, 0, W, H);
				ctx.globalAlpha = _fade;
				ctx.drawImage(offCvs, 0, 0);
				ctx.globalAlpha = 1;
			}

			requestAnimationFrame(loop);
		}

		resumeLoop = () => {
			if (running || !engineCanvas) return;
			running = true;
			prevTS = 0;          // re-sync the clock on every (re)start
			requestAnimationFrame(loop);
		};
		resumeLoop();
	}).catch(() => {});
}

export default function Anim({ isAbout = false }) {
	const canvasRef = useRef(null);

	useEffect(() => {
		if (isAbout) return;
		const cvs = canvasRef.current;
		if (!cvs) return;
		cvs.width = W; cvs.height = H;
		engineCanvas = cvs;
		initEngine();
		resumeLoop();
		return () => {
			if (engineCanvas === cvs) engineCanvas = null;
		};
	}, [isAbout]);

	if (isAbout) {
		return (
		<div className="animContainer">
			<img
			src="/assets/images/headshot.jpg"
			className="animCanvas animPhoto"
			alt="Decorative graphic"
			/>
		</div>
		);
	}

	return (
		<div className="animContainer">
		<a href="/posts/anim/" className="animLink" aria-label="What's that animation?">
			<canvas ref={canvasRef} width={W} height={H} className="animCanvas" />
		</a>
		</div>
	)
}
