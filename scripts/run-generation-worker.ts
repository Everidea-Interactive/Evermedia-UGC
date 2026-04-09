import { runGenerationWorker } from '../lib/generation/worker'

function createWorkerId() {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `worker-${globalThis.crypto.randomUUID()}`
  }

  return `worker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const workerId = process.env.GENERATION_WORKER_ID ?? createWorkerId()

runGenerationWorker(workerId).catch((error) => {
  console.error('[generation-worker] fatal error', error)
  process.exitCode = 1
})
