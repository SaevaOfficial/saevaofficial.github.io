const cutVolume = 0.1

let analyses = []
let analyzeTimer = 0

const userActionPromise = new Promise(resolve => {
  for (const type of ['touchend', 'mouseup', 'keyup']) {
    addEventListener(type, resolve)
  }
})

const audioContextPromise = userActionPromise.then(async () => {
  const ctx = new AudioContext()
  await ctx.resume()
  return ctx
})

export async function getLocalAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      echoCancellationType: 'system',
      latency: 0.01,
      noiseSuppression: true,
    },
  })

  const ctx = await audioContextPromise
  const mediaSourceNode = ctx.createMediaStreamSource(stream)
  // const mediaDestNode = ctx.createMediaStreamDestination()
  // mediaSourceNode.connect(mediaDestNode)

  function onAnalyze(cb) {
    addAnalyze(mediaSourceNode, cb)
  }

  function destroy() {
    removeAnalyze(mediaSourceNode)
    for (const track of stream.getTracks()) track.stop()
  }

  // let muteCount = 0
  // let isMuted = true

  // onAnalyze((volume) => {
  //   if (volume < cutVolume) {
  //     muteCount++
  //   } else {
  //     muteCount = 0
  //   }
  //   if (!isMuted && muteCount > 10) {
  //     mediaSourceNode.disconnect(mediaDestNode)
  //     isMuted = true
  //   }
  //   if (isMuted && muteCount === 0) {
  //     mediaSourceNode.connect(mediaDestNode)
  //     isMuted = false
  //   }
  // })

  // return { stream: mediaDestNode.stream, destroy, onAnalyze }
  return { stream, destroy, onAnalyze }
}

export async function getAudio(stream) {
  const ctx = await audioContextPromise
  const mediaSourceNode = ctx.createMediaStreamSource(stream)
  // const gainNode = ctx.createGain()

  // Chromeで音が鳴らないバグ対策
  // https://blog.twoseven.xyz/chrome-webrtc-remote-volume/
  const audio = new Audio()
  // audio.muted = true
  audio.srcObject = stream
  audio.play()

  // mediaSourceNode.connect(gainNode)
  // gainNode.connect(ctx.destination)

  function setVolume(value) {
    // gainNode.gain.value = value
    audio.volume = value
  }

  function onAnalyze(cb) {
    addAnalyze(mediaSourceNode, cb)
  }

  function destroy() {
    removeAnalyze(mediaSourceNode)
    for (const track of stream.getTracks()) track.stop()
  }

  return { setVolume, destroy, onAnalyze }
}

function analyze() {
  for (const { cb, analyserNode } of analyses) {
    const times = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteTimeDomainData(times)
    cb(times.reduce((p, n) => Math.max(p, n > 128 ? n - 128 : 128 - n), 0) / 128)
  }
  analyzeTimer = setTimeout(analyze, 100)
}

async function addAnalyze(audioNode, cb) {
  const ctx = await audioContextPromise
  const analyserNode = ctx.createAnalyser()

  audioNode.connect(analyserNode)
  // analyserNode.smoothingTimeConstant = 0.5
  // analyserNode.fftSize = 2048
  analyses.push({ audioNode, analyserNode, cb })

  if (!analyzeTimer) {
    analyzeTimer = setTimeout(analyze, 100)
  }
}

function removeAnalyze(audioNode) {
  analyses = analyses.filter((a) => a.audioNode !== audioNode)
  if (!analyses.length) {
    clearTimeout(analyzeTimer)
    analyzeTimer = 0
  }
}
